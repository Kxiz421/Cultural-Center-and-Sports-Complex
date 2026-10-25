import { noCacheJson } from "@/lib/api-cache-control";
import prisma from "@/lib/prisma";
import { requireApiAuth, ownClientId } from "@/lib/api-auth";

/**
 * The signed-in client's own profile — used to fill the Order of Payment
 * (name, complete address, contact number) and similar documents.
 */
export async function GET() {
  const guard = await requireApiAuth();
  if (guard.response) return guard.response;

  const clientId = ownClientId(guard.user);
  if (clientId == null) {
    return noCacheJson({ error: "Not a client account" }, { status: 403 });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        contactNumber: true,
        addressLine: true,
        barangay: true,
        city: true,
        province: true,
      },
    });

    if (!client) {
      return noCacheJson({ error: "Client not found" }, { status: 404 });
    }

    const address = [
      client.addressLine,
      client.barangay,
      client.city,
      client.province,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ");

    return noCacheJson({
      ...client,
      fullName:
        [client.firstName, client.middleName, client.lastName]
          .filter(Boolean)
          .join(" ") || "",
      address,
    });
  } catch (error) {
    console.error("Failed to load client profile:", error);
    return noCacheJson(
      { error: "Failed to load client profile" },
      { status: 500 }
    );
  }
}
