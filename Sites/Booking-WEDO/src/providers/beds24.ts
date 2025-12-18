import { PrismaClient } from '@prisma/client';

export interface Beds24AvailabilityParams {
    propertyId: string[];
    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
    guests: number;
}

export interface Beds24BookingParams {
    propertyId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    status: 'new' | 'confirmed' | 'cancelled';
}

export interface Beds24BookingResponse {
    bookId: string;
    success: boolean;
    message?: string;
}

export interface BookingProvider {
    getAvailability(params: Beds24AvailabilityParams): Promise<any>;
    createBooking(params: Beds24BookingParams): Promise<Beds24BookingResponse>;
    cancelBooking(bookId: string): Promise<boolean>;
}

export class MockBeds24Provider implements BookingProvider {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        console.log("MockBeds24Provider initialized with Prisma persistence");
    }

    async getAvailability(params: Beds24AvailabilityParams): Promise<any> {
        // For Mock, we still return static data, but we *could* check DB for overlaps if we really wanted to.
        // Keeping it simple/static for now as requested.
        return {
            success: true,
            data: params.propertyId.map(pid => ({
                propertyId: pid,
                rooms: [
                    {
                        roomId: `${pid}_room_1`,
                        name: "Standard Room",
                        qty: 5,
                        price: 1500,
                        available: 5
                    },
                    {
                        roomId: `${pid}_room_2`,
                        name: "Deluxe Room",
                        qty: 3,
                        price: 2500,
                        available: 3
                    }
                ]
            }))
        };
    }

    async createBooking(params: Beds24BookingParams): Promise<Beds24BookingResponse> {
        // Generate a simulated ID
        const bookId = `mock_b24_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // In a real provider, we'd make an http call.
        // Here, we "persist" by acknowledging the ID is valid for our system.
        // The actual record is stored by the Caller (Worker) into the 'Hold' or 'Order' table.
        // However, to satisfy "Worker restart doesn't lose state", we rely on the DB record existing.
        // When we need to "check" this booking later (e.g. confirm), we look up the DB.

        return {
            bookId,
            success: true,
            message: "Booking created in Mock Provider (Persisted via DB association)"
        };
    }

    async cancelBooking(bookId: string): Promise<boolean> {
        // To "cancel" in Mock, we verify it exists in DB associated with this ID.
        // This effectively checks persistence.
        const hold = await this.prisma.hold.findFirst({
            where: { beds24ReservationId: bookId }
        });
        const order = await this.prisma.order.findFirst({
            where: { beds24ReservationId: bookId }
        });

        if (hold || order) {
            // In real world, we'd API call to cancel.
            return true;
        }
        return false;
    }
}
