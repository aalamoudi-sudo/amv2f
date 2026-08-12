# Legendary L2 Cross-index

The index is derived from approved `eventDays`, `journeys`, `registeredJourneys`, `experiences`, assets, and garden knowledge. It exposes `daysForPlace`, `journeysForPlace`, `stopsForPlace`, `experiencesForPlace`, `visualsForPlace`, `knowledgeForPlace`, `whenPlaceUsed`, and `contextForExperience`.

“من يمر من هنا؟” uses only registered stop/entity relationships. “متى يُستخدم هذا الموقع؟” returns the sourced journey window and day, never interpolated times. “أين يحدث هذا؟” exists only when an approved experience has an indexed registered stop.
