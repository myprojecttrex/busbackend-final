USE `bus_tracking`;

-- Add trip_codes table
CREATE TABLE IF NOT EXISTS `trip_codes` (
  `id`            int(11)      NOT NULL AUTO_INCREMENT,
  `trip_code`     varchar(10)  NOT NULL UNIQUE,
  `driver_id`     int(11)      NOT NULL,
  `bus_id`        int(11)      NOT NULL,
  `company_id`    int(11)      NOT NULL,
  `from_location` varchar(100) NOT NULL,
  `to_location`   varchar(100) NOT NULL,
  `status`        enum('pending','active','ended','expired') DEFAULT 'pending',
  `created_at`    timestamp    NOT NULL DEFAULT current_timestamp(),
  `activated_at`  timestamp    NULL DEFAULT NULL,
  `ended_at`      timestamp    NULL DEFAULT NULL,
  `expires_at`    timestamp    NOT NULL,
  PRIMARY KEY (`id`),
  KEY `driver_id`  (`driver_id`),
  KEY `bus_id`     (`bus_id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `tc_driver`  FOREIGN KEY (`driver_id`)  REFERENCES `drivers`   (`driver_id`)  ON DELETE CASCADE,
  CONSTRAINT `tc_bus`     FOREIGN KEY (`bus_id`)     REFERENCES `buses`     (`bus_id`)     ON DELETE CASCADE,
  CONSTRAINT `tc_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add speed & trip_code to tracking_locations
ALTER TABLE `tracking_locations`
  ADD COLUMN IF NOT EXISTS `speed`     decimal(6,2) DEFAULT 0.00 AFTER `longitude`,
  ADD COLUMN IF NOT EXISTS `driver_id` int(11)      DEFAULT NULL AFTER `speed`,
  ADD COLUMN IF NOT EXISTS `trip_code` varchar(10)  DEFAULT NULL AFTER `driver_id`;

SHOW TABLES;
