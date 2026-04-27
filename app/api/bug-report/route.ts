import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const email = formData.get('email') as string;
    const game = formData.get('game') as string;
    const attachment = formData.get('attachment') as File | null;

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"CrackOrigins Bug Reporter" <${process.env.GMAIL_USER}>`,
      to: process.env.BUG_REPORT_TO || 'bugs@crackorigins.com',
      replyTo: email || process.env.GMAIL_USER,
      subject: `[Bug Report]${game ? ` [${game}]` : ''} ${title}`,
      text: [
        `Game: ${game || 'N/A'}`,
        `Reporter Email: ${email || 'N/A'}`,
        ``,
        `Title: ${title}`,
        ``,
        `Description:`,
        description,
      ].join('\n'),
    };

    if (attachment && attachment.size > 0) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      mailOptions.attachments = [
        {
          filename: attachment.name,
          content: buffer,
          contentType: attachment.type,
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending bug report:', error);
    return NextResponse.json({ success: false, error: 'Failed to send bug report' }, { status: 500 });
  }
}
