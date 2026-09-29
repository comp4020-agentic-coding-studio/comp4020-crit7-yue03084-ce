-- Hire is priced by ANU Sport's student or general rate, so the demo members
-- now say which they pay, and two general-public members join them. All are
-- invented; none is a real member.
UPDATE `members` SET `name` = 'Demo student with a 2026 package' WHERE `name` = 'Demo member with a 2026 package';
--> statement-breakpoint
UPDATE `members` SET `name` = 'Demo student with no package' WHERE `name` = 'Demo member with no package';
--> statement-breakpoint
UPDATE `members` SET `name` = 'Demo student whose package expired' WHERE `name` = 'Demo member whose package expired';
--> statement-breakpoint
INSERT INTO `members` (`name`, `package_expires_on`, `rate`) VALUES
	('Demo general-public member with a 2026 package', '2027-03-01', 'general'),
	('Demo general-public member with no package', NULL, 'general');
