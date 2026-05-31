import axios from 'axios';

const RESEND_API_KEY = 're_M3BHu1hm_6D3xMu28uzqTGJeahSwv2Dwz';

export async function sendAuthEmail(to: string, code: string) {
    try {
        const html = `
            <div style="background-color: #0c0c12; color: #ffffff; font-family: 'Roboto', Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e1e26;">
                <div style="margin-bottom: 30px;">
                    <h1 style="color: #FFD700; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase;">CRACK ORIGINS</h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 5px; font-weight: 700; letter-spacing: 1px;">EXTERNAL AUTHORIZATION SYSTEM</p>
                </div>
                
                <div style="background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.2); padding: 30px; border-radius: 8px; margin-bottom: 30px;">
                    <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #ffffff; text-transform: uppercase;">Security Verification Code</h2>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 25px;">
                        An external application is attempting to authorize your account. Use the following code to complete the verification process.
                    </p>
                    
                    <div style="background: #1e1e26; color: #FFD700; font-size: 42px; font-weight: 900; padding: 20px; border-radius: 4px; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; border: 1px solid #33333f; display: inline-block;">
                        ${code}
                    </div>
                    
                    <p style="font-size: 12px; color: #FFD700; margin-top: 25px; font-weight: 600;">
                        This verification code will expire in 5 minutes.
                    </p>
                </div>
                
                <div style="border-top: 1px solid #1e1e26; padding-top: 25px;">
                    <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 10px;">
                        If you did not request this, please disregard this transmission immediately. Secure your account if you suspect a breach.
                    </p>
                    <p style="font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.5px;">
                        © 2026 CRACK ORIGINS. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </div>
        `;

        const response = await axios.post('https://api.resend.com/emails', {
            from: 'Crack Origins <noreply@crackorigins.com>', // Ensure domain is verified at resend.com
            to,
            subject: `${code} is your Crack Origins Verification Code`,
            html
        }, {
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('Resend Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || error.message };
    }
}
export async function sendDeletionVerificationEmail(to: string, code: string, name: string) {
    try {
        const html = `
            <div style="background-color: #0c0c12; color: #ffffff; font-family: 'Roboto', Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #ff4b4b;">
                <div style="margin-bottom: 30px;">
                    <h1 style="color: #ff4b4b; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase;">CRACK ORIGINS</h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 5px; font-weight: 700; letter-spacing: 1px;">ACCOUNT TERMINATION PROTOCOL</p>
                </div>
                
                <div style="background: rgba(255, 75, 75, 0.05); border: 1px solid rgba(255, 75, 75, 0.2); padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: left;">
                    <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #ffffff; text-transform: uppercase;">Account Delete Verification Code</h2>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 25px;">
                        Hello <strong>${name}</strong>,<br><br>
                        We received a request to permanently delete your Crack Origins account. To proceed with this critical action, please enter the following verification code in the deletion form.
                    </p>
                    
                    <div style="background: #1e1e26; color: #ff4b4b; font-size: 42px; font-weight: 900; padding: 20px; border-radius: 4px; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; border: 1px solid #33333f; display: block; text-align: center;">
                        ${code}
                    </div>
                    
                    <p style="font-size: 12px; color: #ff4b4b; margin-top: 25px; font-weight: 600;">
                        This verification code will expire in 10 minutes.
                    </p>
                </div>
                
                <div style="border-top: 1px solid #1e1e26; padding-top: 25px;">
                    <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 10px;">
                        If you did not request account deletion, please secure your account immediately and ignore this email.
                    </p>
                    <p style="font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.5px;">
                        © 2026 CRACK ORIGINS. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </div>
        `;

        const response = await axios.post('https://api.resend.com/emails', {
            from: 'Crack Origins <noreply@crackorigins.com>',
            to,
            subject: `Account Delete Verification Code: ${code}`,
            html
        }, {
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('Resend Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || error.message };
    }
}

export async function sendDeletionRequestConfirmationEmail(to: string, name: string) {
    try {
        const html = `
            <div style="background-color: #0c0c12; color: #ffffff; font-family: 'Roboto', Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #ff4b4b;">
                <div style="margin-bottom: 30px;">
                    <h1 style="color: #ff4b4b; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase;">CRACK ORIGINS</h1>
                </div>
                
                <div style="background: rgba(255, 75, 75, 0.05); border: 1px solid rgba(255, 75, 75, 0.2); padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: left;">
                    <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #ffffff; text-transform: uppercase;">Deletion Request Received</h2>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 25px;">
                        Hello <strong>${name}</strong>,<br><br>
                        Your request to delete your Crack Origins account has been successfully recorded. 
                        Following our safety protocol, your account is now scheduled for permanent erasure in <strong>30 days</strong>.
                    </p>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6;">
                        During this period, your profile and data will remain in our database but will be inaccessible. 
                        If you change your mind, please contact support before the 30-day period expires.
                    </p>
                </div>
                
                <div style="border-top: 1px solid #1e1e26; padding-top: 25px;">
                    <p style="font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.5px;">
                        © 2026 CRACK ORIGINS. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </div>
        `;

        await axios.post('https://api.resend.com/emails', {
            from: 'Crack Origins <noreply@crackorigins.com>',
            to,
            subject: `Account Deletion Request - Crack Origins`,
            html
        }, {
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error('Resend Error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}
