import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

interface FCMTokenRequest {
  user_type: "salon" | "admin" | "customer";
  user_id: number;
  device_token: string;
  device_name?: string;
}

interface DeleteTokenRequest {
  device_token: string;
}

interface UpdateTokenRequest {
  device_token: string;
  last_used_at?: string;
}

export async function GET(req: NextRequest) {
  try {
    const sb = createAdminClient();
    const userType = req.nextUrl.searchParams.get("user_type");
    const userId = req.nextUrl.searchParams.get("user_id");
    const isActive = req.nextUrl.searchParams.get("is_active") === "1";

    let query = sb.from("fcm_tokens").select("*");

    if (userType) query = query.eq("user_type", userType);
    if (userId) query = query.eq("user_id", parseInt(userId));
    if (isActive !== undefined) query = query.eq("is_active", isActive);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[FCM API] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = createAdminClient();
    const body: FCMTokenRequest = await req.json();

    const { user_type, user_id, device_token, device_name } = body;

    // Validate required fields
    if (!user_type || !user_id || !device_token) {
      return NextResponse.json(
        { error: "Missing required fields: user_type, user_id, device_token" },
        { status: 400 }
      );
    }

    // Check if token already exists for this user
    const { data: existing } = await sb
      .from("fcm_tokens")
      .select("id")
      .eq("user_type", user_type)
      .eq("user_id", user_id)
      .eq("device_token", device_token)
      .single();

    if (existing) {
      // Update existing token
      const { error } = await sb
        .from("fcm_tokens")
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Token updated",
        id: existing.id,
      });
    }

    // Insert new token
    const { data, error } = await sb
      .from("fcm_tokens")
      .insert({
        user_type,
        user_id,
        device_token,
        device_name,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("[FCM API] Token saved:", {
      id: data.id,
      user_type,
      user_id,
      device_name,
    });

    return NextResponse.json({
      ok: true,
      message: "Token saved successfully",
      id: data.id,
    });
  } catch (error) {
    console.error("[FCM API] POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = createAdminClient();
    const body: UpdateTokenRequest = await req.json();

    const { device_token, last_used_at } = body;

    if (!device_token) {
      return NextResponse.json(
        { error: "device_token is required" },
        { status: 400 }
      );
    }

    const { error } = await sb
      .from("fcm_tokens")
      .update({
        last_used_at: last_used_at || new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("device_token", device_token);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Token updated" });
  } catch (error) {
    console.error("[FCM API] PATCH Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sb = createAdminClient();
    const body: DeleteTokenRequest = await req.json();

    const { device_token } = body;

    if (!device_token) {
      return NextResponse.json(
        { error: "device_token is required" },
        { status: 400 }
      );
    }

    const { error } = await sb
      .from("fcm_tokens")
      .update({ is_active: false })
      .eq("device_token", device_token);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("[FCM API] Token deactivated:", device_token);

    return NextResponse.json({ ok: true, message: "Token deleted" });
  } catch (error) {
    console.error("[FCM API] DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
