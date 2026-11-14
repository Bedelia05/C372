const connection = require('../config/db');

function rollbackTransaction(callback) {
  connection.rollback(() => callback());
}

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  connection.beginTransaction((beginErr) => {
    if (beginErr) return callback(beginErr);

    const verifyPetSql = 'SELECT id FROM pets WHERE id = ? AND owner_id = ?';
    connection.query(verifyPetSql, [petId, ownerId], (petErr, petRows) => {
      if (petErr) {
        return rollbackTransaction(() => callback(petErr));
      }

      if (!petRows.length) {
        return rollbackTransaction(() => callback(null, null));
      }

      const serviceSql = 'SELECT id, price FROM services WHERE id = ? AND is_active = 1';
      connection.query(serviceSql, [serviceId], (serviceErr, serviceRows) => {
        if (serviceErr) {
          return rollbackTransaction(() => callback(serviceErr));
        }

        if (!serviceRows.length) {
          return rollbackTransaction(() => callback(null, null));
        }

        const service = serviceRows[0];
        const bookingSql = `INSERT INTO service_bookings
          (pet_id, service_id, booking_status, booked_price, booking_date)
          VALUES (?, ?, 'pending', ?, ?)`;

        connection.query(bookingSql, [petId, serviceId, service.price, bookingDate], (bookingErr, bookingResult) => {
          if (bookingErr) {
            return rollbackTransaction(() => callback(bookingErr));
          }

          const paymentSql = `INSERT INTO payments
            (booking_id, amount, payment_status, payment_reference)
            VALUES (?, ?, 'pending', NULL)`;

          connection.query(paymentSql, [bookingResult.insertId, service.price], (paymentErr, paymentResult) => {
            if (paymentErr) {
              return rollbackTransaction(() => callback(paymentErr));
            }

            connection.commit((commitErr) => {
              if (commitErr) {
                return rollbackTransaction(() => callback(commitErr));
              }

              callback(null, {
                bookingId: bookingResult.insertId,
                paymentId: paymentResult.insertId
              });
            });
          });
        });
      });
    });
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `SELECT
    sb.id AS booking_id,
    DATE_FORMAT(sb.booking_date, '%Y-%m-%d') AS booking_date,
    p.name AS pet_name,
    s.name AS service_name,
    sb.booked_price,
    sb.booking_status,
    pay.payment_status
  FROM service_bookings AS sb
  INNER JOIN pets AS p ON p.id = sb.pet_id
  INNER JOIN services AS s ON s.id = sb.service_id
  LEFT JOIN payments AS pay ON pay.booking_id = sb.id
  WHERE p.owner_id = ?
  ORDER BY sb.created_at DESC, sb.id DESC`;

  connection.query(sql, [ownerId], callback);
}

module.exports = {
  createPendingBooking,
  getBookingsByOwner
};
