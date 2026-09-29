-- The courts are the club's published list (anutennis.org/courtbookings/),
-- with South Oval's four from Celeste. The members are invented demo people,
-- one per package state the rules distinguish; none is a real member.
INSERT INTO `courts` (`location`, `name`) VALUES
	('South Oval Tennis Courts', 'South Oval Court 1'),
	('South Oval Tennis Courts', 'South Oval Court 2'),
	('South Oval Tennis Courts', 'South Oval Court 3'),
	('South Oval Tennis Courts', 'South Oval Court 4'),
	('Mills Road Tennis Court', 'Mills Road Court'),
	('Crawford / Old Canberra House Tennis Court', 'Crawford Court');
--> statement-breakpoint
INSERT INTO `members` (`name`, `package_expires_on`) VALUES
	('Demo member with a 2026 package', '2027-03-01'),
	('Demo member with no package', NULL),
	('Demo member whose package expired', '2026-03-01');
