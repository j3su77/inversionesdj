import ImageKit from "imagekit";
import { NextResponse } from "next/server";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export async function GET() {
  try {
    if (
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
      !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
    ) {
      throw new Error("ImageKit configuration is incomplete");
    }

    return NextResponse.json(imagekit.getAuthenticationParameters());
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Error generating auth parameters" },
      { status: 500 }
    );
  }
}
