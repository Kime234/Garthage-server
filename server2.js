// ============================================================
// 🏛️ CARTHAGE SERVER v2.0
// سيرفر تطبيق قرطاج - حضارة تونس الخالدة 🇹🇳
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const axios = require('axios');

// ===== تحميل متغيرات البيئة =====
dotenv.config();

// ===== تهيئة Firebase Admin =====
if (!admin.apps.length) {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const db = admin.firestore();
const auth = admin.auth();

// ===== تهيئة Express =====
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
});

// ===== Middleware =====
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== Rate Limiting =====
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '⚠️ تم تجاوز عدد الطلبات المسموحة، حاول مرة أخرى بعد 15 دقيقة',
});
app.use('/api/', limiter);

// ============================================================
// ===== ROUTES =====
// ============================================================

// ===== 1. اختبار الاتصال =====
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '🏛️ سيرفر قرطاج يعمل بنجاح! 🇹🇳',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
    });
});

// ===== 2. مصادقة المستخدمين - تسجيل =====
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: displayName || 'مستخدم',
        });

        await db.collection('users').doc(userRecord.uid).set({
            displayName: displayName || 'مستخدم',
            email,
            coins: 100,
            pkPoints: 0,
            pkWins: 0,
            followers: 0,
            following: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('wallets').doc(userRecord.uid).set({
            balance: 0,
            coins: 100,
            currency: 'USD',
        });

        res.status(201).json({
            success: true,
            message: '✅ تم إنشاء الحساب بنجاح',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
            },
        });
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ===== 3. الحصول على Token VideoSDK =====
app.post('/api/streams/token', async (req, res) => {
    try {
        const { userId, roomId } = req.body;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        }

        const response = await axios.post(
            'https://api.videosdk.live/v2/rooms',
            {
                name: roomId || `stream_${userId}_${Date.now()}`,
                settings: {
                    mode: 'group',
                    maxParticipants: 100,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.VIDEOSDK_API_KEY}`,
                },
            }
        );

        res.json({
            success: true,
            token: response.data.token,
            roomId: response.data.roomId,
        });
    } catch (error) {
        console.error('خطأ في الحصول على Token:', error);
        res.status(500).json({ success: false, error: 'فشل الحصول على Token' });
    }
});

// ===== 4. بدء بث مباشر =====
app.post('/api/streams/start', async (req, res) => {
    try {
        const { userId, title, category, thumbnail } = req.body;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        }
        const userData = userDoc.data();

        const streamId = `stream_${Date.now()}`;
        const streamRef = db.collection('live_streams').doc(streamId);

        await streamRef.set({
            streamId,
            hostId: userId,
            hostName: userData.displayName,
            hostAvatar: userData.photoURL || '',
            title: title || 'بث مباشر جديد',
            category: category || '🎭 مضحك',
            thumbnail: thumbnail || '',
            isLive: true,
            viewers: 0,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            endedAt: null,
        });

        const tokenResponse = await axios.post(
            'https://api.videosdk.live/v2/rooms',
            {
                name: streamId,
                settings: {
                    mode: 'group',
                    maxParticipants: 100,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.VIDEOSDK_API_KEY}`,
                },
            }
        );

        await streamRef.update({
            roomToken: tokenResponse.data.token,
        });

        res.json({
            success: true,
            streamId,
            token: tokenResponse.data.token,
            roomId: tokenResponse.data.roomId,
        });
    } catch (error) {
        console.error('خطأ في بدء البث:', error);
        res.status(500).json({ success: false, error: 'فشل بدء البث' });
    }
});

// ===== 5. إنهاء البث =====
app.post('/api/streams/end', async (req, res) => {
    try {
        const { streamId, userId } = req.body;

        const streamRef = db.collection('live_streams').doc(streamId);
        const streamDoc = await streamRef.get();

        if (!streamDoc.exists) {
            return res.status(404).json({ success: false, error: 'البث غير موجود' });
        }

        const streamData = streamDoc.data();
        if (streamData.hostId !== userId) {
            return res.status(403).json({ success: false, error: 'غير مصرح لك' });
        }

        await streamRef.update({
            isLive: false,
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: '✅ تم إنهاء البث بنجاح' });
    } catch (error) {
        console.error('خطأ في إنهاء البث:', error);
        res.status(500).json({ success: false, error: 'فشل إنهاء البث' });
    }
});

// ===== 6. الحصول على البثوث الحية =====
app.get('/api/streams/live', async (req, res) => {
    try {
        const snapshot = await db.collection('live_streams')
            .where('isLive', '==', true)
            .orderBy('viewers', 'desc')
            .limit(50)
            .get();

        const streams = [];
        snapshot.forEach(doc => {
            streams.push({ id: doc.id, ...doc.data() });
        });

        res.json({ success: true, streams });
    } catch (error) {
        console.error('خطأ في جلب البثوث:', error);
        res.status(500).json({ success: false, error: 'فشل جلب البثوث' });
    }
});

// ===== 7. الحصول على البثوث القريبة (رادار) =====
app.post('/api/streams/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 10 } = req.body;

        const snapshot = await db.collection('live_streams')
            .where('isLive', '==', true)
            .get();

        const streams = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.location) {
                const distance = calculateDistance(
                    lat, lng,
                    data.location.lat, data.location.lng
                );
                if (distance <= radius) {
                    streams.push({ id: doc.id, ...data, distance });
                }
            }
        });

        streams.sort((a, b) => (a.distance || 999) - (b.distance || 999));

        res.json({ success: true, streams });
    } catch (error) {
        console.error('خطأ في جلب البثوث القريبة:', error);
        res.status(500).json({ success: false, error: 'فشل جلب البثوث القريبة' });
    }
});

// ===== 8. المحفظة - جلب الرصيد =====
app.get('/api/wallet/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const walletDoc = await db.collection('wallets').doc(userId).get();

        if (!walletDoc.exists) {
            return res.status(404).json({ success: false, error: 'المحفظة غير موجودة' });
        }

        res.json({ success: true, wallet: walletDoc.data() });
    } catch (error) {
        console.error('خطأ في جلب المحفظة:', error);
        res.status(500).json({ success: false, error: 'فشل جلب المحفظة' });
    }
});

// ===== 9. الإيداع =====
app.post('/api/wallet/deposit', async (req, res) => {
    try {
        const { userId, amount, method, transactionId } = req.body;

        const walletRef = db.collection('wallets').doc(userId);
        const walletDoc = await walletRef.get();

        if (!walletDoc.exists) {
            return res.status(404).json({ success: false, error: 'المحفظة غير موجودة' });
        }

        await walletRef.update({
            balance: admin.firestore.FieldValue.increment(amount),
        });

        await db.collection('transactions').add({
            userId,
            type: 'deposit',
            amount,
            method,
            transactionId,
            status: 'completed',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: '✅ تم الإيداع بنجاح' });
    } catch (error) {
        console.error('خطأ في الإيداع:', error);
        res.status(500).json({ success: false, error: 'فشل الإيداع' });
    }
});

// ===== 10. طلب سحب =====
app.post('/api/wallet/withdraw', async (req, res) => {
    try {
        const { userId, amount, method, bankAccountId } = req.body;

        const walletRef = db.collection('wallets').doc(userId);
        const walletDoc = await walletRef.get();

        if (!walletDoc.exists) {
            return res.status(404).json({ success: false, error: 'المحفظة غير موجودة' });
        }

        const walletData = walletDoc.data();
        if (walletData.balance < amount) {
            return res.status(400).json({ success: false, error: 'الرصيد غير كافٍ' });
        }

        await walletRef.update({
            balance: admin.firestore.FieldValue.increment(-amount),
        });

        const withdrawalRef = db.collection('withdrawal_requests').doc();
        await withdrawalRef.set({
            userId,
            amount,
            method,
            bankAccountId,
            status: 'pending',
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            message: '✅ تم تقديم طلب السحب بنجاح',
            withdrawalId: withdrawalRef.id,
        });
    } catch (error) {
        console.error('خطأ في طلب السحب:', error);
        res.status(500).json({ success: false, error: 'فشل طلب السحب' });
    }
});

// ===== 11. تحويل P2P =====
app.post('/api/wallet/transfer', async (req, res) => {
    try {
        const { senderId, receiverId, amount, currency, note } = req.body;

        if (senderId === receiverId) {
            return res.status(400).json({ success: false, error: 'لا يمكن التحويل لنفس المستخدم' });
        }

        const field = currency === 'USD' ? 'balance' : 'coins';
        const senderWalletRef = db.collection('wallets').doc(senderId);
        const receiverWalletRef = db.collection('wallets').doc(receiverId);

        const [senderDoc, receiverDoc] = await Promise.all([
            senderWalletRef.get(),
            receiverWalletRef.get(),
        ]);

        if (!senderDoc.exists) {
            return res.status(404).json({ success: false, error: 'محفظة المرسل غير موجودة' });
        }
        if (!receiverDoc.exists) {
            return res.status(404).json({ success: false, error: 'محفظة المستلم غير موجودة' });
        }

        const senderData = senderDoc.data();
        if ((senderData[field] || 0) < amount) {
            return res.status(400).json({ success: false, error: 'الرصيد غير كافٍ' });
        }

        await db.runTransaction(async (transaction) => {
            transaction.update(senderWalletRef, {
                [field]: admin.firestore.FieldValue.increment(-amount),
            });
            transaction.update(receiverWalletRef, {
                [field]: admin.firestore.FieldValue.increment(amount),
            });
        });

        await db.collection('p2p_transfers').add({
            senderId,
            receiverId,
            amount,
            currency,
            note: note || '',
            status: 'completed',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        const senderUser = await db.collection('users').doc(senderId).get();
        await db.collection('notifications').add({
            userId: receiverId,
            title: '💰 تحويل ورد',
            body: `${senderUser.data()?.displayName || 'مستخدم'} أرسل لك ${amount} ${currency}`,
            type: 'transfer',
            data: { senderId, amount },
            isRead: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: '✅ تم التحويل بنجاح' });
    } catch (error) {
        console.error('خطأ في التحويل:', error);
        res.status(500).json({ success: false, error: 'فشل التحويل' });
    }
});

// ===== 12. معارك PK - إنشاء تحدي =====
app.post('/api/pk/challenge', async (req, res) => {
    try {
        const { challengerId, opponentId } = req.body;

        if (challengerId === opponentId) {
            return res.status(400).json({ success: false, error: 'لا يمكن تحدي نفسك' });
        }

        const [challengerDoc, opponentDoc] = await Promise.all([
            db.collection('users').doc(challengerId).get(),
            db.collection('users').doc(opponentId).get(),
        ]);

        if (!challengerDoc.exists || !opponentDoc.exists) {
            return res.status(404).json({ success: false, error: 'أحد المستخدمين غير موجود' });
        }

        const challengeRef = db.collection('pk_challenges').doc();
        await challengeRef.set({
            challengerId,
            challengerName: challengerDoc.data()?.displayName || 'مستخدم',
            opponentId,
            opponentName: opponentDoc.data()?.displayName || 'مستخدم',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('notifications').add({
            userId: opponentId,
            title: '⚔️ تحدي جديد',
            body: `${challengerDoc.data()?.displayName || 'مستخدم'} يتحداك في معركة PK!`,
            type: 'pk_challenge',
            data: { challengeId: challengeRef.id },
            isRead: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            message: '✅ تم إرسال التحدي',
            challengeId: challengeRef.id,
        });
    } catch (error) {
        console.error('خطأ في إنشاء التحدي:', error);
        res.status(500).json({ success: false, error: 'فشل إنشاء التحدي' });
    }
});

// ===== 13. تحديث نتيجة PK =====
app.post('/api/pk/result', async (req, res) => {
    try {
        const { challengeId, winnerId, loserId, winnerScore, loserScore } = req.body;

        const challengeRef = db.collection('pk_challenges').doc(challengeId);
        const challengeDoc = await challengeRef.get();

        if (!challengeDoc.exists) {
            return res.status(404).json({ success: false, error: 'التحدي غير موجود' });
        }

        await challengeRef.update({
            status: 'completed',
            winnerId,
            loserId,
            winnerScore,
            loserScore,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('users').doc(winnerId).update({
            pkPoints: admin.firestore.FieldValue.increment(winnerScore),
            pkWins: admin.firestore.FieldValue.increment(1),
        });

        const winnerUser = await db.collection('users').doc(winnerId).get();
        await db.collection('notifications').add({
            userId: winnerId,
            title: '🏆 فوز في المعركة!',
            body: `فزت في معركة PK بنتيجة ${winnerScore} - ${loserScore}`,
            type: 'pk_win',
            data: { challengeId },
            isRead: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: '✅ تم تحديث نتيجة المعركة' });
    } catch (error) {
        console.error('خطأ في تحديث نتيجة PK:', error);
        res.status(500).json({ success: false, error: 'فشل تحديث النتيجة' });
    }
});

// ===== 14. جلب المنشورات =====
app.get('/api/posts', async (req, res) => {
    try {
        const { category, limit = 20, lastDocId } = req.query;

        let query = db.collection('posts').orderBy('createdAt', 'desc').limit(parseInt(limit));

        if (category && category !== 'الكل') {
            query = query.where('category', '==', category);
        }

        if (lastDocId) {
            const lastDoc = await db.collection('posts').doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();
        const posts = [];
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() });
        });

        res.json({ success: true, posts });
    } catch (error) {
        console.error('خطأ في جلب المنشورات:', error);
        res.status(500).json({ success: false, error: 'فشل جلب المنشورات' });
    }
});

// ===== 15. إنشاء منشور =====
app.post('/api/posts', async (req, res) => {
    try {
        const { userId, mediaUrl, mediaType, caption, category } = req.body;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        }
        const userData = userDoc.data();

        const postRef = await db.collection('posts').add({
            userId,
            userName: userData.displayName,
            userAvatar: userData.photoURL || '',
            mediaUrl,
            mediaType: mediaType || 'image',
            caption: caption || '',
            category: category || '🎭 مضحك',
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
app.listen(PORT, () => {
  console.log(`✅ سيرفر قرطاج خادم على المنفذ ${PORT}`);
});
