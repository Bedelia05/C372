const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

function getLocalTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateString(dateValue) {
  if (typeof dateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return false;
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return true;
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function listServices(req, res) {
  const userId = req.session.user.id;
  const requestedPetId = req.query.petId;

  petModel.getPetsByOwner(userId, (petErr, pets) => {
    if (petErr) {
      console.error('Error loading pets:', petErr);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceErr, services) => {
      if (serviceErr) {
        console.error('Error loading services:', serviceErr);
        return res.status(500).send('Unable to load services.');
      }

      const validPet = Array.isArray(pets)
        ? pets.find((pet) => String(pet.id) === String(requestedPetId))
        : null;

      const selectedPetId = validPet ? String(validPet.id) : '';

      return res.render('services', {
        pets: pets || [],
        services: services || [],
        selectedPetId,
        today: getLocalTodayString(),
        messages: req.flash('success'),
        errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const ownerId = req.session.user.id;
  const petId = parsePositiveInteger(req.body.petId);
  const serviceId = parsePositiveInteger(req.body.serviceId);
  const bookingDate = req.body.bookingDate;
  const today = getLocalTodayString();

  if (!petId || !serviceId || !isValidDateString(bookingDate) || bookingDate < today) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }

  serviceBookingModel.createPendingBooking(ownerId, petId, serviceId, bookingDate, (err, result) => {
    if (err) {
      console.error('Error creating booking:', err);
      req.flash('error', 'Unable to create the booking. Please try again.');
      return res.redirect(`/services?petId=${petId}`);
    }

    if (!result) {
      req.flash('error', 'That pet or service is unavailable for booking.');
      return res.redirect('/services');
    }

    req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
    return res.redirect('/bookings');
  });
}

function listBookings(req, res) {
  const userId = req.session.user.id;

  serviceBookingModel.getBookingsByOwner(userId, (err, bookings) => {
    if (err) {
      console.error('Error loading booking history:', err);
      return res.status(500).send('Unable to load booking history.');
    }

    return res.render('bookings', {
      bookings: bookings || [],
      messages: req.flash('success'),
      errors: req.flash('error'),
      session: req.session
    });
  });
}

module.exports = {
  listServices,
  createBooking,
  listBookings
};
