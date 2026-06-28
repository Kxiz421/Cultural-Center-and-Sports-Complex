import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendOtpEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.client.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.client.update({
      where: { email },
      data: { otp, otpExpiration },
    });

    // Send OTP via Gmail SMTP
    const emailSent = await sendOtpEmail(email, otp);

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "OTP sent successfully"
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const user = await prisma.client.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if OTP matches and is not expired
    if (user.otp !== otp || !user.otpExpiration || user.otpExpiration < new Date()) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.client.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if OTP matches and is not expired
    if (user.otp !== otp || !user.otpExpiration || user.otpExpiration < new Date()) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Update password and clear OTP fields
    await prisma.client.update({
      where: { email },
      data: {
        password: newPassword,
        otp: null,
        otpExpiration: null,
      },
    });

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}