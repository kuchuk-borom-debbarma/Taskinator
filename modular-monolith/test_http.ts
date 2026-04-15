import jwt from 'jsonwebtoken';

async function test() {
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
        const token = jwt.sign(
            {
                id: '3cde0ca8-092e-4fa4-97d6-3bf4665b37ba',
                email: 'k@g.com',
                username: 'k',
            },
            JWT_SECRET,
            { expiresIn: '24h' },
        );

        const res = await fetch(
            'http://127.0.0.1:3000/auth/users?search=&limit=15',
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );

        const data = await res.json();
        if (!res.ok) {
            console.error('HTTP Error:', res.status, data);
        } else {
            console.log('Success:', data);
        }
    } catch (e: any) {
        console.error('Fatal Error:', e.message);
    }
    process.exit(0);
}
test();
