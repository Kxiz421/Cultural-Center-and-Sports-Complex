-- A client may register with only an email OR only a mobile number - whichever
-- contact they choose to verify in the registration stepper. The unused column
-- therefore has to be optional. Existing rows keep their values, and the unique
-- index on email still permits multiple NULLs.
ALTER TABLE Client MODIFY email VARCHAR(150) NULL;
ALTER TABLE Client MODIFY contact_number VARCHAR(20) NULL;
