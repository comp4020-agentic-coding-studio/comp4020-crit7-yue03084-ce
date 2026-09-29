-- Membership now has a date of its own. Every existing demo member holds a
-- 2026 ANUTC membership, valid to the end of February 2027 as the club
-- states. One invented non-member joins them: the courts are general hire, so
-- anyone can book, but without membership there's no package to use.
UPDATE `members` SET `membership_valid_until` = '2027-02-28';
--> statement-breakpoint
INSERT INTO `members` (`name`, `package_expires_on`, `membership_valid_until`, `rate`) VALUES
	('Demo general-public non-member', NULL, NULL, 'general');
