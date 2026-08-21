<?php

declare(strict_types=1);

final class WebDispecinkDateHelper
{
    public static function getCostsInterval(int $year, int $month): array
    {
        $start = new DateTime(sprintf('%04d-%02d-01 00:00:00', $year, $month), new DateTimeZone('Europe/Prague'));
        $end = clone $start;
        $end->modify('last day of this month')->setTime(23, 59);

        return [
            'casod' => $start->format('d.m.Y H:i:s'),
            'casdo' => $end->format('d.m.Y H:i:s'),
        ];
    }

    public static function getConsumptionInterval(int $year, int $month): array
    {
        $start = new DateTime(sprintf('%04d-%02d-01 00:00:00', $year, $month), new DateTimeZone('Europe/Prague'));
        $end = clone $start;
        $end->modify('last day of this month')->setTime(23, 59, 59);

        $start->setTimezone(new DateTimeZone('UTC'));
        $end->setTimezone(new DateTimeZone('UTC'));

        return [
            'DateStart' => $start->format('Y-m-d H:i:s'),
            'DateEnd' => $end->format('Y-m-d H:i:s'),
        ];
    }
}