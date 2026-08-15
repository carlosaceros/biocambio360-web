import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, emailOrPhone, action, winningSegment } = body;

        if (!name || !emailOrPhone) {
            return NextResponse.json(
                { allowed: false, reason: 'Ingresa tu nombre y correo/celular para participar.' },
                { status: 400 }
            );
        }

        const inputRaw = emailOrPhone.trim().toLowerCase();
        const isEmail = inputRaw.includes('@');
        const isPhone = /^[0-9+\s\-()]{7,15}$/.test(inputRaw);

        if (!isEmail && !isPhone) {
            return NextResponse.json(
                { allowed: false, reason: 'Ingresa un número de celular de 10 dígitos o un correo electrónico válido.' },
                { status: 400 }
            );
        }

        // Extract Client IP
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const clientIp = (forwardedFor ? forwardedFor.split(',')[0] : realIp || '127.0.0.1').trim();

        // 30 days window calculation
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgoISO = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

        const spinsRef = collection(db, 'wheel_spins');
        let existingSpin: any = null;

        // 1. Check Identity (Email or Phone) in Firestore
        try {
            if (isEmail) {
                const q = query(spinsRef, where('email', '==', inputRaw));
                const snap = await getDocs(q);
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.spunAt && data.spunAt > thirtyDaysAgoISO) {
                        existingSpin = data;
                    }
                });
            } else if (isPhone) {
                const cleanPhone = inputRaw.replace(/\D/g, '');
                const q = query(spinsRef, where('phoneClean', '==', cleanPhone));
                const snap = await getDocs(q);
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.spunAt && data.spunAt > thirtyDaysAgoISO) {
                        existingSpin = data;
                    }
                });
            }
        } catch (e) {
            console.warn('Error querying Firestore wheel_spins:', e);
        }

        if (existingSpin) {
            const spunDate = new Date(existingSpin.spunAt).toLocaleDateString('es-CO');
            return NextResponse.json({
                allowed: false,
                reason: `Ya participaste en la ruleta el ${spunDate}. Puedes volver a participar después de 30 días.`,
                previousCoupon: {
                    code: existingSpin.couponCode,
                    label: existingSpin.winningLabel,
                    spunAt: existingSpin.spunAt
                }
            });
        }

        // 2. Check IP Rate Limiting (max 3 spins per IP per 30 days to protect WiFi networks)
        try {
            const ipQuery = query(spinsRef, where('ip', '==', clientIp));
            const ipSnap = await getDocs(ipQuery);
            let ipCountRecent = 0;
            ipSnap.forEach(doc => {
                const data = doc.data();
                if (data.spunAt && data.spunAt > thirtyDaysAgoISO) {
                    ipCountRecent++;
                }
            });

            if (ipCountRecent >= 3) {
                return NextResponse.json({
                    allowed: false,
                    reason: 'Se ha alcanzado el límite máximo de giros permitidos por red este mes.'
                });
            }
        } catch (e) {
            console.warn('Error checking IP rate limit:', e);
        }

        // Action: Validate Only
        if (action === 'validate') {
            return NextResponse.json({ allowed: true, clientIp });
        }

        // Action: Spin / Record Redemption
        if (action === 'spin' && winningSegment) {
            const cleanPhone = isPhone ? inputRaw.replace(/\D/g, '') : '';
            const spinRecord = {
                name: name.trim(),
                email: isEmail ? inputRaw : null,
                phone: isPhone ? inputRaw : null,
                phoneClean: cleanPhone || null,
                ip: clientIp,
                spunAt: new Date().toISOString(),
                winningLabel: winningSegment.label,
                couponCode: winningSegment.couponCode || '',
                segmentId: winningSegment.id || ''
            };

            try {
                await addDoc(spinsRef, spinRecord);
            } catch (e) {
                console.error('Error adding wheel_spins record:', e);
            }

            return NextResponse.json({
                success: true,
                spinRecord
            });
        }

        return NextResponse.json({ allowed: true });
    } catch (error: any) {
        console.error('Error in wheel-spin API:', error);
        return NextResponse.json({ allowed: true }, { status: 200 });
    }
}
