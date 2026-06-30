import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const salt = bcrypt.genSaltSync(12);
  const ADMIN_PW = bcrypt.hashSync('admin123', salt);
  const CLERK_PW = bcrypt.hashSync('clerk123', salt);
  const PASS321 = bcrypt.hashSync('pass321', salt);
  const PASS654 = bcrypt.hashSync('pass654', salt);
  const PASS987 = bcrypt.hashSync('pass987', salt);
  const PASS159 = bcrypt.hashSync('pass159', salt);
  const PASS753 = bcrypt.hashSync('pass753', salt);
  console.log('Seeding database...\n');

  // ===== REFERENCE TABLES =====

  // Staff Roles
  const roles = await Promise.all([
    prisma.staffRole.create({ data: { roleName: 'Admin' } }),
    prisma.staffRole.create({ data: { roleName: 'Accounting Clerk' } }),
    prisma.staffRole.create({ data: { roleName: 'Program Coordinator' } }),
    prisma.staffRole.create({ data: { roleName: 'Local Treasury Operations Officer' } }),
  ]);
  console.log(`✓ Created ${roles.length} staff roles`);

  // Staff Organizations
  const orgs = await Promise.all([
    prisma.staffOrganization.create({ data: { orgName: 'South Cotabato Gymnasium and Cultural Center' } }),
    prisma.staffOrganization.create({ data: { orgName: "Provincial Treasurer's Office" } }),
    prisma.staffOrganization.create({ data: { orgName: 'South Cotabato Sports Complex' } }),
  ]);
  console.log(`✓ Created ${orgs.length} staff organizations`);

  // Client Roles
  const clientRoles = await Promise.all([
    prisma.clientRole.create({ data: { clientRoleId: 'PUB', roleName: 'Public Client' } }),
    prisma.clientRole.create({ data: { clientRoleId: 'PROV', roleName: 'Provincial Government' } }),
  ]);
  console.log(`✓ Created ${clientRoles.length} client roles`);

  // Client Organizations
  const clientOrgs = await Promise.all([
    prisma.clientOrganization.create({ data: { organizationName: 'Mendoza Catering Services' } }),
    prisma.clientOrganization.create({ data: { organizationName: 'Notre Dame of Marbel University' } }),
    prisma.clientOrganization.create({ data: { organizationName: 'South Cotabato State College' } }),
    prisma.clientOrganization.create({ data: { organizationName: 'Villanueva Events Management' } }),
    prisma.clientOrganization.create({ data: { organizationName: 'STI College Koronadal' } }),
  ]);
  console.log(`✓ Created ${clientOrgs.length} client organizations`);

  // Availability Statuses
  const statuses = await Promise.all([
    prisma.availabilityStatus.create({ data: { statusName: 'Available' } }),
    prisma.availabilityStatus.create({ data: { statusName: 'Unavailable' } }),
    prisma.availabilityStatus.create({ data: { statusName: 'Under Maintenance' } }),
    prisma.availabilityStatus.create({ data: { statusName: 'Archived' } }),
  ]);
  console.log(`✓ Created ${statuses.length} availability statuses`);

  // Booking Statuses
  const bookingStatuses = await Promise.all([
    prisma.bookingStatus.create({ data: { status: 'Confirmed' } }),
    prisma.bookingStatus.create({ data: { status: 'Cancelled' } }),
    prisma.bookingStatus.create({ data: { status: 'Pending' } }),
  ]);
  console.log(`✓ Created ${bookingStatuses.length} booking statuses`);

  // Payment Statuses
  const paymentStatuses = await Promise.all([
    prisma.paymentStatus.create({ data: { status: 'Paid' } }),
    prisma.paymentStatus.create({ data: { status: 'Unpaid' } }),
    prisma.paymentStatus.create({ data: { status: 'Partial' } }),
  ]);
  console.log(`✓ Created ${paymentStatuses.length} payment statuses`);

  // Announcement Statuses
  const annStatuses = await Promise.all([
    prisma.announcementStatus.create({ data: { status: 'Active' } }),
    prisma.announcementStatus.create({ data: { status: 'Inactive' } }),
    prisma.announcementStatus.create({ data: { status: 'Archived' } }),
  ]);
  console.log(`✓ Created ${annStatuses.length} announcement statuses`);

  // Approval Statuses
  const approvalStatuses = await Promise.all([
    prisma.approvalStatus.create({ data: { status: 'Approved' } }),
    prisma.approvalStatus.create({ data: { status: 'Pending' } }),
    prisma.approvalStatus.create({ data: { status: 'Declined' } }),
  ]);
  console.log(`✓ Created ${approvalStatuses.length} approval statuses`);

  // Document Types
  const docTypes = await Promise.all([
    prisma.documentType.create({ data: { type: 'Request Letter' } }),
    prisma.documentType.create({ data: { type: 'Contract of Lease' } }),
    prisma.documentType.create({ data: { type: 'Certification' } }),
    prisma.documentType.create({ data: { type: 'Billing Statement' } }),
    prisma.documentType.create({ data: { type: 'Official Receipt' } }),
  ]);
  console.log(`✓ Created ${docTypes.length} document types`);

  // Time Slots
  const timeSlots = await Promise.all([
    prisma.timeSlot.create({ data: { startTime: '08:00 AM', endTime: '05:00 PM' } }),
    prisma.timeSlot.create({ data: { startTime: '05:00 PM', endTime: '11:00 PM' } }),
  ]);
  console.log(`✓ Created ${timeSlots.length} time slots`);

  // Facility Venues
  const venues = await Promise.all([
    prisma.facilityVenue.create({ data: { venue: 'South Cotabato Gymnasium and Cultural Center' } }),
    prisma.facilityVenue.create({ data: { venue: 'South Cotabato Sports Complex' } }),
  ]);
  console.log(`✓ Created ${venues.length} facility venues`);

  // ===== STAFF =====
  const staff1 = await prisma.staff.create({
    data: {
      username: 'admin', firstName: 'Maria', lastName: 'Santos', email: 'admin@scgcc.gov.ph',
      contactNumber: '09171234567', password: ADMIN_PW, status: 'Active',
      profilePhoto: 'photo1.jpg', staffRoleId: 1, staffOrgId: 1,
    },
  });
  const staff2 = await prisma.staff.create({
    data: {
      username: 'coordinator', firstName: 'Juan', lastName: 'Dela Cruz', email: 'coordinator@scgcc.gov.ph',
      contactNumber: '09182345678', password: ADMIN_PW, status: 'Active',
      profilePhoto: 'photo2.jpg', staffRoleId: 3, staffOrgId: 1,
    },
  });
  const staff3 = await prisma.staff.create({
    data: {
      username: 'clerk', firstName: 'Rosa', lastName: 'Reyes', email: 'clerk@scgcc.gov.ph',
      contactNumber: '09193456789', password: CLERK_PW, status: 'Active',
      profilePhoto: 'photo3.jpg', staffRoleId: 2, staffOrgId: 2,
    },
  });
  const staff4 = await prisma.staff.create({
    data: {
      username: 'ltoo', firstName: 'Pedro', lastName: 'Lim', email: 'ltoo@scgcc.gov.ph',
      contactNumber: '09204567890', password: ADMIN_PW, status: 'Active',
      profilePhoto: 'photo4.jpg', staffRoleId: 4, staffOrgId: 2,
    },
  });
  const staff5 = await prisma.staff.create({
    data: {
      username: 'ana', firstName: 'Ana', lastName: 'Gonzales', email: 'ana.gonzales@scgcc.gov.ph',
      contactNumber: '09215678901', password: ADMIN_PW, status: 'Active',
      profilePhoto: 'photo5.jpg', staffRoleId: 3, staffOrgId: 3,
    },
  });
  console.log(`✓ Created ${5} staff members`);

  // ===== CLIENTS =====
  const client1 = await prisma.client.create({
    data: {
      firstName: 'Carlo', middleName: 'Santos', lastName: 'Mendoza',
      email: 'carlo@email.com', contactNumber: '09170111222', password: PASS321,
      idProof: 'id1.jpg', accountStatus: 'Active', verificationStatus: 'Pending', profilePhoto: 'client1.jpg',
      clientRoleId: 'PROV', clientOrgId: 1,
    },
  });
  const client2 = await prisma.client.create({
    data: {
      firstName: 'Beatriz', middleName: 'Reyes', lastName: 'Lopez',
      email: 'beatriz@email.com', contactNumber: '09171222333', password: PASS654,
      idProof: 'id2.jpg', accountStatus: 'Active', verificationStatus: 'Pending', profilePhoto: 'client2.jpg',
      clientRoleId: 'PUB', clientOrgId: 2,
    },
  });
  const client3 = await prisma.client.create({
    data: {
      firstName: 'Daniel', middleName: 'Gomez', lastName: 'Flores',
      email: 'daniel@email.com', contactNumber: '09172333444', password: PASS987,
      idProof: 'id3.jpg', accountStatus: 'Active', verificationStatus: 'Pending', profilePhoto: 'client3.jpg',
      clientRoleId: 'PUB', clientOrgId: 3,
    },
  });
  const client4 = await prisma.client.create({
    data: {
      firstName: 'Katrina', middleName: 'Beltran', lastName: 'Villanueva',
      email: 'katrina@email.com', contactNumber: '09173444555', password: PASS159,
      idProof: 'id4.jpg', accountStatus: 'Deactivated', verificationStatus: 'Pending', profilePhoto: 'client4.jpg',
      clientRoleId: 'PROV', clientOrgId: 4,
    },
  });
  const client5 = await prisma.client.create({
    data: {
      firstName: 'Mark', middleName: 'Dizon', lastName: 'Bautista',
      email: 'mark@email.com', contactNumber: '09174555666', password: PASS753,
      idProof: 'id5.jpg', accountStatus: 'Deactivated', verificationStatus: 'Pending', profilePhoto: 'client5.jpg',
      clientRoleId: 'PUB', clientOrgId: 5,
    },
  });
  console.log(`✓ Created ${5} clients`);

  // ===== PARTICULARS =====
  const particulars = await Promise.all([
    prisma.particular.create({ data: { particularName: 'Chair', description: 'Plastic monoblock chair for seating arrangements up to 700 units available' } }),
    prisma.particular.create({ data: { particularName: 'Table', description: 'Standard rectangular table for events up to 8 units available' } }),
    prisma.particular.create({ data: { particularName: 'Wireless Microphone', description: 'Wireless handheld microphone for program presentations 4 units available' } }),
    prisma.particular.create({ data: { particularName: 'Wired Microphone', description: 'Wired microphone for program presentations 10 units available' } }),
    prisma.particular.create({ data: { particularName: 'LED Wall', description: 'LED wall composed of 117 panels available for visual display during events' } }),
    prisma.particular.create({ data: { particularName: 'Compressor', description: 'Air conditioning system suitable for events with a capacity of 250 per pax.' } }),
  ]);
  console.log(`✓ Created ${particulars.length} particulars`);

  // ===== FACILITY RATES =====
  const rates = await Promise.all([
    prisma.facilityRate.create({ data: { dayRate: 20000, nightRate: 25000 } }),
    prisma.facilityRate.create({ data: { dayRate: 1500, nightRate: 2000 } }),
    prisma.facilityRate.create({ data: { dayRate: 20000, nightRate: 25000 } }),
    prisma.facilityRate.create({ data: { dayRate: 1000, nightRate: 1500 } }),
    prisma.facilityRate.create({ data: { dayRate: 3000, nightRate: 3000 } }),
  ]);
  console.log(`✓ Created ${rates.length} facility rates`);

  // ===== FACILITIES =====
  const facilities = await Promise.all([
    prisma.facility.create({
      data: {
        facilityName: 'South Cotabato Gymnasium and Cultural Center',
        description: 'Primary venue located at 26 Rafael Alunan Avenue Zone IV Koronadal City South Cotabato',
        rateId: 1, statusId: 1, venueId: 1,
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Basketball Court',
        description: 'Court for basketball games with shot clock support',
        rateId: 2, statusId: 2, venueId: 1,
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Stage Area',
        description: 'Stage area for cultural presentations and program performances',
        rateId: 3, statusId: 3, venueId: 1,
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Gym Lobby',
        description: 'Event space suitable for small gatherings, exhibits, and formal registrations',
        rateId: 4, statusId: 2, venueId: 1,
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Track Oval',
        description: 'Used for jogging or sprints',
        rateId: 5, statusId: 1, venueId: 2,
      },
    }),hi
  ]);
  console.log(`✓ Created ${facilities.length} facilities`);

  // ===== FACILITY IMAGES =====
  const facilityImagesData = [
    { image: 'scgcc_main.jpg', facilityId: 1 },
    { image: 'scgcc_side.jpg', facilityId: 1 },
    { image: 'scgcc_front.jpg', facilityId: 1 },
    { image: 'basketball_court.jpg', facilityId: 2 },
    { image: 'stage_area.jpg', facilityId: 3 },
    { image: 'gym_lobby.jpg', facilityId: 4 },
    { image: 'track_oval.jpg', facilityId: 5 },
  ];
  for (const img of facilityImagesData) {
    await prisma.facilityImage.create({ data: img });
  }
  console.log(`✓ Created ${facilityImagesData.length} facility images`);

  // ===== INVENTORY =====
  const inventoryItems = await Promise.all([
    prisma.inventory.create({ data: { itemName: 'Chair', description: 'Plastic monoblock chair for seating arrangements up to 700 units available', unitCost: 5, quantityAvailable: 700, venueId: 1, statusId: 1, particularId: 1 } }),
    prisma.inventory.create({ data: { itemName: 'Table', description: 'Standard rectangular table for events up to 8 units available', unitCost: 258, quantityAvailable: 8, venueId: 1, statusId: 2, particularId: 2 } }),
    prisma.inventory.create({ data: { itemName: 'Wireless Microphone', description: 'Wireless handheld microphone for program presentations 4 units available', unitCost: 1200, quantityAvailable: 4, venueId: 1, statusId: 1, particularId: 3 } }),
    prisma.inventory.create({ data: { itemName: 'Wired Microphone', description: 'Wired microphone for program presentations 10 units available', unitCost: 1200, quantityAvailable: 10, venueId: 1, statusId: 1, particularId: 4 } }),
    prisma.inventory.create({ data: { itemName: 'LED Wall', description: 'LED wall composed of 117 panels available for visual display during events', unitCost: 20000, quantityAvailable: 1, venueId: 1, statusId: 2, particularId: 5 } }),
    prisma.inventory.create({ data: { itemName: 'Compressor', description: 'Air conditioning system suitable for events with a capacity of 250 per pax.', unitCost: 800, quantityAvailable: 10, venueId: 1, statusId: 3, particularId: 6 } }),
    prisma.inventory.create({ data: { itemName: 'Hurdles', description: 'A physical barrier jumped over in athletic races', unitCost: 5, quantityAvailable: 75, venueId: 2, statusId: 1, particularId: 1 } }),
  ]);
  console.log(`✓ Created ${inventoryItems.length} inventory items`);

  // ===== PACKAGES =====
  const packages = await Promise.all([
    prisma.package.create({ data: { packageName: 'Standard Day Package', dayRate: 55000, timeSlotId: 1 } }),
    prisma.package.create({ data: { packageName: 'Standard Night Package', nightRate: 60000, timeSlotId: 2 } }),
    prisma.package.create({ data: { packageName: 'LED Wall Day Package', ledWallDayRate: 80000, timeSlotId: 1 } }),
    prisma.package.create({ data: { packageName: 'LED Wall Night Package', ledWallNightRate: 85000, timeSlotId: 2 } }),
  ]);
  console.log(`✓ Created ${packages.length} packages`);

  // ===== PACKAGE INCLUSIONS =====
  await prisma.packageInclusion.createMany({
    data: [
      { quantityAvailable: 700, packageId: 1, itemId: 1 },
      { quantityAvailable: 8, packageId: 1, itemId: 2 },
      { quantityAvailable: 4, packageId: 1, itemId: 3 },
      { quantityAvailable: 1, packageId: 1, itemId: 4 },
      { quantityAvailable: 700, packageId: 2, itemId: 1 },
      { quantityAvailable: 8, packageId: 2, itemId: 2 },
      { quantityAvailable: 4, packageId: 2, itemId: 3 },
      { quantityAvailable: 1, packageId: 2, itemId: 4 },
      { quantityAvailable: 700, packageId: 3, itemId: 1 },
      { quantityAvailable: 8, packageId: 3, itemId: 2 },
      { quantityAvailable: 4, packageId: 3, itemId: 3 },
      { quantityAvailable: 1, packageId: 3, itemId: 4 },
      { quantityAvailable: 700, packageId: 4, itemId: 1 },
      { quantityAvailable: 8, packageId: 4, itemId: 2 },
      { quantityAvailable: 4, packageId: 4, itemId: 3 },
      { quantityAvailable: 1, packageId: 4, itemId: 4 },
    ],
  });
  console.log(`✓ Created package inclusions`);

  // ===== RESERVATIONS =====
  const reservations = await Promise.all([
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-04-10'), eventType: 'Recognition Ceremony',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-01T09:00:00'),
        venueId: 1, clientId: 1, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-04-15'), eventType: 'Corporate Dinner',
        reservationStatus: 'Pending', submittedAt: new Date('2026-03-02T10:30:00'),
        venueId: 1, clientId: 2, timeSlotId: 2,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-04-20'), eventType: 'Cultural Festival',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-03T08:45:00'),
        venueId: 1, clientId: 3, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-04-25'), eventType: 'Stage Play Rehearsal',
        reservationStatus: 'Declined', submittedAt: new Date('2026-03-04T11:00:00'),
        venueId: 1, clientId: 4, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-05'), eventType: 'Art Exhibit Opening',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-10T08:00:00'),
        venueId: 1, clientId: 1, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-12'), eventType: 'Music Concert',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-12T10:00:00'),
        venueId: 1, clientId: 3, timeSlotId: 2,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-18'), eventType: 'Provincial Meeting',
        reservationStatus: 'Pending', submittedAt: new Date('2026-03-15T09:00:00'),
        venueId: 1, clientId: 5, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-01'), eventType: 'Provincial Government Assembly',
        reservationStatus: 'Pending', submittedAt: new Date('2026-03-05T14:00:00'),
        venueId: 2, clientId: 5, packageId: 1, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-08'), eventType: 'Barangay Basketball League',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-08T09:00:00'),
        venueId: 2, clientId: 2, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-15'), eventType: 'Inter-School Volleyball Tournament',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-11T10:00:00'),
        venueId: 2, clientId: 3, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-22'), eventType: 'Track and Field Event',
        reservationStatus: 'Pending', submittedAt: new Date('2026-03-14T11:00:00'),
        venueId: 2, clientId: 1, timeSlotId: 2,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-05-29'), eventType: 'Badminton Championship',
        reservationStatus: 'Approved', submittedAt: new Date('2026-03-18T08:30:00'),
        venueId: 2, clientId: 4, timeSlotId: 1,
      },
    }),
    prisma.reservation.create({
      data: {
        eventDate: new Date('2026-06-05'), eventType: 'Zumba Fitness Festival',
        reservationStatus: 'Pending', submittedAt: new Date('2026-03-20T09:00:00'),
        venueId: 2, clientId: 2, timeSlotId: 1,
      },
    }),
  ]);
  console.log(`✓ Created ${reservations.length} reservations`);

  // ===== RESERVED PARTICULARS =====
  await prisma.reservedParticular.createMany({
    data: [
      { quantity: 100, reservationId: 1, particularId: 1 },
      { quantity: 2, reservationId: 1, particularId: 4 },
      { quantity: 200, reservationId: 2, particularId: 1 },
      { quantity: 2, reservationId: 2, particularId: 2 },
      { quantity: 150, reservationId: 3, particularId: 1 },
      { quantity: 4, reservationId: 3, particularId: 2 },
      { quantity: 4, reservationId: 3, particularId: 3 },
      { quantity: 700, reservationId: 4, particularId: 1 },
      { quantity: 1, reservationId: 4, particularId: 5 },
    ],
  });
  console.log(`✓ Created reserved particulars`);

  // ===== BOOKINGS =====
  const bookings = await Promise.all([
    prisma.booking.create({ data: { confirmationDate: new Date('2026-03-05T10:00:00'), reservationId: 1, bookingStatusId: 1, staffId: 2 } }),
    prisma.booking.create({ data: { confirmationDate: new Date('2026-03-06T11:00:00'), reservationId: 3, bookingStatusId: 3, staffId: null } }),
    prisma.booking.create({ data: { confirmationDate: new Date('2026-03-07T09:00:00'), reservationId: 1, bookingStatusId: 1, staffId: 2 } }),
    prisma.booking.create({ data: { confirmationDate: new Date('2026-03-08T13:00:00'), reservationId: 5, bookingStatusId: 1, staffId: 2 } }),
    prisma.booking.create({ data: { confirmationDate: new Date('2026-03-09T15:00:00'), reservationId: 2, bookingStatusId: 2, staffId: 2 } }),
  ]);
  console.log(`✓ Created ${bookings.length} bookings`);

  // ===== PAYMENTS =====
  const payments = await Promise.all([
    prisma.payment.create({ data: { amountPaid: 27500, paymentStatusId: 3, staffId: 4, bookingId: 1 } }),
    prisma.payment.create({ data: { amountPaid: 27500, paymentStatusId: 1, staffId: 4, bookingId: 2 } }),
    prisma.payment.create({ data: { amountPaid: 30000, paymentStatusId: 3, staffId: 4, bookingId: 3 } }),
    prisma.payment.create({ data: { amountPaid: 27500, paymentStatusId: 2, staffId: 4, bookingId: 4 } }),
    prisma.payment.create({ data: { amountPaid: 55000, paymentStatusId: 1, staffId: 4, bookingId: 5 } }),
  ]);
  console.log(`✓ Created ${payments.length} payments`);

  // ===== TRANSACTIONS =====
  await Promise.all([
    prisma.transaction.create({ data: { receiptNumber: 'OR-2026-001', paymentDate: new Date('2026-03-01'), recordedBy: 'Local Treasury Operations Officer', bookingId: 4, paymentId: 1 } }),
    prisma.transaction.create({ data: { receiptNumber: 'OR-2026-002', paymentDate: new Date('2026-03-03'), recordedBy: 'Local Treasury Operations Officer', bookingId: 4, paymentId: 2 } }),
    prisma.transaction.create({ data: { receiptNumber: 'OR-2026-003', paymentDate: new Date('2026-03-02'), recordedBy: 'Local Treasury Operations Officer', bookingId: 4, paymentId: 3 } }),
    prisma.transaction.create({ data: { receiptNumber: 'OR-2026-004', paymentDate: new Date('2026-03-05'), recordedBy: 'Local Treasury Operations Officer', bookingId: 4, paymentId: 4 } }),
    prisma.transaction.create({ data: { receiptNumber: 'OR-2026-005', paymentDate: new Date('2026-03-07'), recordedBy: 'Local Treasury Operations Officer', bookingId: 4, paymentId: 3 } }),
  ]);
  console.log(`✓ Created ${5} transactions`);

  // ===== DOCUMENTS =====
  await Promise.all([
    prisma.document.create({ data: { documentTypeId: 1, filePath: 'docs/request_letter_booking1.pdf', status: 'Pending', remarks: 'Governor approved the request letter for Recognition Ceremony', submittedAt: new Date('2026-03-02T10:30:00'), bookingId: 1, staffId: 4 } }),
    prisma.document.create({ data: { documentTypeId: 2, filePath: 'docs/contract_booking1.pdf', status: 'Pending', remarks: 'Contract of lease issued by Local Treasury Operations Officer', submittedAt: new Date('2026-03-05T10:35:00'), bookingId: 1, staffId: 2 } }),
    prisma.document.create({ data: { documentTypeId: 3, filePath: 'docs/cert_booking1.pdf', status: 'Pending', remarks: 'Certification issued by Provincial Treasurers Office', submittedAt: new Date('2026-03-05T10:40:00'), bookingId: 1, staffId: 2 } }),
    prisma.document.create({ data: { documentTypeId: 4, filePath: 'docs/billing_booking2.pdf', status: 'Pending', remarks: 'Please resubmit billing statement with complete breakdown of charges', submittedAt: new Date('2026-03-03T11:20:00'), bookingId: 2, staffId: 2 } }),
    prisma.document.create({ data: { documentTypeId: 5, filePath: 'docs/receipt_booking2.pdf', status: 'Pending', remarks: 'Initial 50 percent payment receipt must be submitted 7 days before the event', submittedAt: new Date('2026-03-03T11:25:00'), bookingId: 2, staffId: null } }),
  ]);
  console.log(`✓ Created ${5} documents`);

  // ===== LETTERS =====
  await Promise.all([
    prisma.letterStatus.create({ data: { letterRemarks: "Governor approved the request letter for Recognition Ceremony. Endorsed to Provincial Treasurer's Office", updatedAt: new Date('2026-03-04T14:00:00'), reservationId: 1, approvalStatusId: 1, staffId: 4 } }),
    prisma.letterStatus.create({ data: { letterRemarks: "Governor approved the request letter for Cultural Festival. Letter forwarded to Provincial Treasurer's Office", updatedAt: new Date('2026-03-05T09:00:00'), reservationId: 3, approvalStatusId: 1, staffId: 4 } }),
    prisma.letterStatus.create({ data: { letterRemarks: "Request letter for Provincial Government Assembly is currently under review by Governor's Office. Review takes 3 days", updatedAt: new Date('2026-03-06T10:00:00'), reservationId: 5, approvalStatusId: 2, staffId: null } }),
    prisma.letterStatus.create({ data: { letterRemarks: "Private clients are not required to submit a request letter to the Governor's Office", updatedAt: new Date('2026-03-07T11:00:00'), reservationId: 2, approvalStatusId: 3, staffId: 4 } }),
    prisma.letterStatus.create({ data: { letterRemarks: 'Request letter for Basketball Tournament declined due to incomplete event details', updatedAt: new Date('2026-03-08T13:00:00'), reservationId: 4, approvalStatusId: 3, staffId: 4 } }),
  ]);
  console.log(`✓ Created ${5} letter statuses`);

  // ===== ANNOUNCEMENTS =====
  await Promise.all([
    prisma.announcement.create({ data: { title: 'Main Gymnasium Maintenance Schedule', content: 'The Main Gymnasium will undergo routine maintenance and cleaning on April 5 2026. No bookings will be accommodated on this date.', recipientType: 'All', datePosted: new Date('2026-03-01T08:00:00'), staffId: 1, statusId: 1 } }),
    prisma.announcement.create({ data: { title: 'Air Conditioning Unit Inspection Notice', content: 'All air conditioning units in the South Cotabato Gymnasium and Cultural Center will be inspected and serviced on April 8 2026.', recipientType: 'All', datePosted: new Date('2026-03-02T09:00:00'), staffId: 1, statusId: 1 } }),
    prisma.announcement.create({ data: { title: 'LED Wall Maintenance Advisory', content: 'The LED Wall composed of 117 panels will be undergoing calibration and maintenance on April 12 2026. Reservations requiring the LED Wall on this date will not be accommodated.', recipientType: 'Clients', datePosted: new Date('2026-03-03T10:00:00'), staffId: 1, statusId: 1 } }),
    prisma.announcement.create({ data: { title: 'Restroom Renovation Notice', content: 'Restroom facilities will be temporarily closed for renovation from April 15 to April 17 2026. Alternative arrangements will be provided for confirmed bookings.', recipientType: 'All', datePosted: new Date('2026-03-04T08:30:00'), staffId: 1, statusId: 1 } }),
    prisma.announcement.create({ data: { title: 'Lights and Sound System Check', content: 'The lights and sound system including the 12 PAR64 lights and microphone equipment will be tested and serviced on April 20 2026.', recipientType: 'Staff', datePosted: new Date('2026-03-05T07:00:00'), staffId: 1, statusId: 3 } }),
  ]);
  console.log(`✓ Created ${5} announcements`);

  // ===== NOTIFICATIONS =====
  await Promise.all([
    prisma.notification.create({ data: { message: "Your Certification is ready to be claimed at the Provincial Treasurer's Office.", sentAt: new Date('2026-04-07T08:00:00'), staffId: 4, clientId: 1 } }),
    prisma.notification.create({ data: { message: "Your Certification is ready to be claimed at the Provincial Treasurer's Office.", sentAt: new Date('2026-04-07T08:00:00'), staffId: 4, clientId: 2 } }),
    prisma.notification.create({ data: { message: 'The Certification for your event has been processed and is ready for claiming.', sentAt: new Date('2026-04-07T10:15:00'), staffId: 4, clientId: 3 } }),
    prisma.notification.create({ data: { message: "Your signed Contract of Lease is ready at the Provincial Treasurer's Office.", sentAt: new Date('2026-04-07T14:20:00'), staffId: 4, clientId: 4 } }),
    prisma.notification.create({ data: { message: "Please proceed to the Provincial Treasurer's Office to claim your Certification.", sentAt: new Date('2026-04-07T11:00:00'), staffId: 4, clientId: 5 } }),
  ]);
  console.log(`✓ Created ${5} notifications`);

  // ===== SCHEDULES =====
  await Promise.all([
    prisma.schedule.create({ data: { clientId: 1, reservationId: 1, facilityId: 1 } }),
    prisma.schedule.create({ data: { clientId: 2, reservationId: 2, facilityId: 2 } }),
    prisma.schedule.create({ data: { clientId: 3, bookingId: 3, facilityId: 3 } }),
    prisma.schedule.create({ data: { clientId: 4, bookingId: 4, facilityId: 4 } }),
    prisma.schedule.create({ data: { clientId: 5, reservationId: 5, facilityId: 1 } }),
  ]);
  console.log(`✓ Created ${5} schedule entries`);

  console.log('\n✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });