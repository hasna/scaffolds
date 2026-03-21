import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.enum(["general", "sales", "support", "billing", "partnership", "other"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    // In a real app, you would:
    // 1. Store the message in a database table
    // 2. Send an email notification to the support team
    // 3. Send an auto-reply email to the user

    // For now, we'll just log it and return success
    console.log("Contact form submission:", {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message.substring(0, 100) + "...",
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement email sending via email service
    // await sendEmail({
    //   to: "support@example.com",
    //   subject: `Contact Form: ${data.subject}`,
    //   body: `
    //     Name: ${data.name}
    //     Email: ${data.email}
    //     Subject: ${data.subject}
    //
    //     Message:
    //     ${data.message}
    //   `,
    // });

    return NextResponse.json({
      success: true,
      message: "Your message has been received. We'll get back to you shortly.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
