const pool = require('../models/db');

class BookingController {
    async getAvailableSeats(req, res) {
        try {
            const { rows } = await pool.query(`
                SELECT 
                    id,
                    seat_number,
                    row_number,
                    is_booked,
                    booking_time
                FROM seats
                ORDER BY row_number, seat_number
            `);

            res.json(rows);
        } catch (error) {
            res.status(500).json({
                message: 'Error fetching seat status',
                error: error.message
            });
        }
    }

    async bookSeats(req, res) {
        const client = await pool.connect();
        try {
            const { seatNumbers } = req.body;
            const userId = req.user.id;

            // Validate input
            if (!Array.isArray(seatNumbers) || seatNumbers.length < 1 || seatNumbers.length > 7) {
                return res.status(400).json({
                    message: 'Number of seats must be between 1 and 7'
                });
            }

            await client.query('BEGIN');

            // Check if seats are available
            const availabilityCheck = await client.query(
                'SELECT id FROM seats WHERE id = ANY($1) AND is_booked = TRUE',
                [seatNumbers]
            );

            if (availabilityCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: 'Some selected seats are already booked'
                });
            }

            // Book the seats
            await client.query(
                'UPDATE seats SET is_booked = TRUE, booked_by = $1, booking_time = NOW() WHERE id = ANY($2)',
                [userId, seatNumbers]
            );

            await client.query('COMMIT');
            
            res.json({
                message: 'Seats booked successfully',
                seats: seatNumbers
            });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({
                message: 'Error booking seats',
                error: error.message
            });
        } finally {
            client.release();
        }
    }

    async cancelBooking(req, res) {
        const client = await pool.connect();
        try {
            const { seatIds } = req.body;
            const userId = req.user.id;

            await client.query('BEGIN');

            // Verify seat ownership
            const verifyQuery = `
                SELECT COUNT(*) 
                FROM seats 
                WHERE id = ANY($1) 
                AND booked_by = $2
            `;
            const { rows } = await client.query(verifyQuery, [seatIds, userId]);

            if (rows[0].count !== seatIds.length) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    message: 'You can only cancel your own bookings'
                });
            }

            // Cancel bookings
            await client.query(`
                UPDATE seats 
                SET is_booked = FALSE, 
                    booked_by = NULL, 
                    booking_time = NULL 
                WHERE id = ANY($1)
            `, [seatIds]);

            await client.query('COMMIT');
            
            res.json({
                message: 'Booking cancelled successfully'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({
                message: 'Error cancelling booking',
                error: error.message
            });
        } finally {
            client.release();
        }
    }

    async findBestAvailableSeats(client, numberOfSeats) {
        // First try to find seats in the same row
        const sameRowQuery = `
            WITH RowAvailability AS (
                SELECT row_number, COUNT(*) as available_seats
                FROM seats
                WHERE NOT is_booked
                GROUP BY row_number
                HAVING COUNT(*) >= $1
                ORDER BY row_number
                LIMIT 1
            )
            SELECT s.id
            FROM seats s
            JOIN RowAvailability r ON s.row_number = r.row_number
            WHERE NOT s.is_booked
            ORDER BY s.seat_number
            LIMIT $1;
        `;

        const sameRowResult = await client.query(sameRowQuery, [numberOfSeats]);

        if (sameRowResult.rows.length === numberOfSeats) {
            return sameRowResult.rows.map(row => row.id);
        }

        // If same row not available, find nearest available seats
        const nearestSeatsQuery = `
            SELECT id
            FROM seats
            WHERE NOT is_booked
            ORDER BY row_number, seat_number
            LIMIT $1;
        `;

        const nearestResult = await client.query(nearestSeatsQuery, [numberOfSeats]);
        return nearestResult.rows.map(row => row.id);
    }
}

module.exports = new BookingController();