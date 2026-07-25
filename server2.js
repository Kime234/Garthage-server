const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== API Routes =====

// 1. اختبار السيرفر (الصفحة الرئيسية)
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🏛️ سيرفر قرطاج يعمل بنجاح! 🇹🇳',
        version: '2.0.0',
        endpoints: {
            health: '/api/health',
            stats: '/api/stats',
            users: '/api/users',
            posts: '/api/posts',
            register: '/api/register (POST)',
            login: '/api/login (POST)',
            streams: '/api/streams/live'
        }
    });
});

// 2. اختبار صحة السيرفر
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '🏛️ سيرفر قرطاج يعمل بنجاح! 🇹🇳',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        status: 'online'
    });
});

// 3. إحصائيات عامة
app.get('/api/stats', (req, res) => {
    res.json({
        activeUsers: Math.floor(Math.random() * 10000) + 1000,
        views: Math.floor(Math.random() * 100000) + 10000,
        likes: Math.floor(Math.random() * 50000) + 5000,
        coins: Math.floor(Math.random() * 10000) + 1000
    });
});

// 4. قائمة المستخدمين
app.get('/api/users', (req, res) => {
    res.json([
        { id: 1, name: 'مستخدم 1', coins: 100, avatar: '' },
        { id: 2, name: 'مستخدم 2', coins: 200, avatar: '' },
        { id: 3, name: 'مستخدم 3', coins: 300, avatar: '' },
        { id: 4, name: 'مستخدم 4', coins: 400, avatar: '' },
        { id: 5, name: 'مستخدم 5', coins: 500, avatar: '' }
    ]);
});

// 5. تسجيل مستخدم جديد
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'جميع الحقول مطلوبة'
        });
    }
    
    res.json({
        success: true,
        message: '✅ تم تسجيل المستخدم بنجاح',
        user: { id: Date.now(), name, email }
    });
});

// 6. تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'البريد الإلكتروني وكلمة المرور مطلوبة'
        });
    }
    
    res.json({
        success: true,
        message: '✅ تم تسجيل الدخول بنجاح',
        token: 'fake-jwt-token-' + Date.now(),
        user: { id: Date.now(), email, name: 'مستخدم' }
    });
});

// 7. إنشاء منشور جديد
app.post('/api/posts', (req, res) => {
    const { userId, mediaUrl, mediaType, caption, category } = req.body;
    
    res.json({
        success: true,
        message: '✅ تم نشر المنشور بنجاح',
        post: {
            id: Date.now(),
            userId,
            mediaUrl: mediaUrl || 'https://example.com/media.jpg',
            mediaType: mediaType || 'image',
            caption: caption || '',
            category: category || '🎭 مضحك',
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            createdAt: new Date().toISOString()
        }
    });
});

// 8. جلب المنشورات
app.get('/api/posts', (req, res) => {
    res.json({
        success: true,
        posts: [
            {
                id: 1,
                userId: 1,
                userName: 'مستخدم 1',
                userAvatar: '',
                mediaUrl: 'https://example.com/video1.mp4',
                mediaType: 'video',
                caption: 'فيديو مضحك 🎭',
                category: '🎭 مضحك',
                likes: 42,
                comments: 12,
                shares: 5,
                views: 150,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                userId: 2,
                userName: 'مستخدم 2',
                userAvatar: '',
                mediaUrl: 'https://example.com/image1.jpg',
                mediaType: 'image',
                caption: 'صورة تراثية 🏛️',
                category: '🏛️ تاريخي',
                likes: 28,
                comments: 8,
                shares: 3,
                views: 90,
                createdAt: new Date().toISOString()
            }
        ]
    });
});

// 9. بدء بث مباشر
app.post('/api/streams/start', (req, res) => {
    const { userId, title, category } = req.body;
    
    res.json({
        success: true,
        message: '✅ تم بدء البث المباشر',
        stream: {
            id: 'stream_' + Date.now(),
            hostId: userId,
            title: title || 'بث مباشر جديد',
            category: category || '🎭 مضحك',
            viewers: 0,
            isLive: true,
            startedAt: new Date().toISOString()
        }
    });
});

// 10. جلب البثوث الحية
app.get('/api/streams/live', (req, res) => {
    res.json({
        success: true,
        streams: [
            {
                id: 'stream_1',
                hostName: 'مضيف 1',
                title: 'بث مباشر مضحك',
                category: '🎭 مضحك',
                viewers: 45,
                isLive: true
            },
            {
                id: 'stream_2',
                hostName: 'مضيف 2',
                title: 'بث تاريخي عن قرطاج',
                category: '🏛️ تاريخي',
                viewers: 28,
                isLive: true
            }
        ]
    });
});

// ===== تشغيل السيرفر =====
app.listen(PORT, () => {
    console.log('🏛️ سيرفر قرطاج v2.0 يعمل على http://localhost:' + PORT);
    console.log('🇹🇳 جاهز للاستخدام!');
    console.log('📡 الروابط المتاحة:');
    console.log('  - GET  /');
    console.log('  - GET  /api/health');
    console.log('  - GET  /api/stats');
    console.log('  - GET  /api/users');
    console.log('  - POST /api/register');
    console.log('  - POST /api/login');
    console.log('  - POST /api/posts');
    console.log('  - GET  /api/posts');
    console.log('  - POST /api/streams/start');
    console.log('  - GET  /api/streams/live');
});                         
