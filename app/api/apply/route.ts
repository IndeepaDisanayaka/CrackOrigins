import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      fullName,
      role,
      email,
      socialUrl,
      about,
      whyApplying,
      age,
      country,
      experience,
      canMakeLowpoly,
      tools,
      whyApplyingThis
    } = data;

    // Use environment variables or hardcoded (for now, usually we use env vars for SMTP)
    const SMTP_EMAIL = process.env.SMTP_EMAIL || 'your-email@gmail.com'; // User needs to configure this
    const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''; 

    // If no credentials, we can just log for now or return success so UI works
    if (!SMTP_EMAIL || !SMTP_PASSWORD) {
      console.warn('SMTP credentials not configured. Form data:', data);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: SMTP_EMAIL,
      to: SMTP_EMAIL, // Send to the admin's email
      subject: `New Job Application: ${fullName} - ${role}`,
      html: `
        <h2>New Application for ${role}</h2>
        <p><strong>Full Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Age:</strong> ${age}</p>
        <p><strong>Country:</strong> ${country}</p>
        <p><strong>Social URL:</strong> <a href="${socialUrl}">${socialUrl}</a></p>
        <p><strong>Experience:</strong><br/> ${experience}</p>
        <p><strong>About:</strong><br/> ${about}</p>
        <p><strong>Why Applying:</strong><br/> ${whyApplying}</p>
        ${role === 'Game Developer' || role === '3D Artist' ? `
          <p><strong>Can make lowpoly?:</strong> ${canMakeLowpoly ? 'Yes' : 'No'}</p>
          <p><strong>Tools:</strong> ${tools?.join(', ') || 'None'}</p>
          <p><strong>Why applying for this role:</strong><br/> ${whyApplyingThis}</p>
        ` : ''}
        <br/>
        <p><small>The applicant has agreed to the part-time final agreement.</small></p>
      `,
    };

    if (SMTP_EMAIL && SMTP_PASSWORD) {
      await transporter.sendMail(mailOptions);
    }

    return NextResponse.json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error sending application:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
