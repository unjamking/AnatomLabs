#!/bin/bash
set -e

npx prisma db push --accept-data-loss

npx prisma migrate resolve --applied 20260122203428_init 2>/dev/null || true
npx prisma migrate resolve --applied 20260128093409_init 2>/dev/null || true
npx prisma migrate resolve --applied 20260129124333_nutrition_tracking 2>/dev/null || true
npx prisma migrate resolve --applied 20260130140239_add_micronutrients_to_food_and_nutrition_log 2>/dev/null || true
npx prisma migrate resolve --applied 20260203135409_add_workout_sessions 2>/dev/null || true
npx prisma migrate resolve --applied 20260203231746_add_health_profile 2>/dev/null || true
npx prisma migrate resolve --applied 20260204095021_add_activity_tracking_fields 2>/dev/null || true
npx prisma migrate resolve --applied 20260211230741_add_biomarker_report_share_insight_models 2>/dev/null || true
npx prisma migrate resolve --applied 20260213070920_add_coach_system 2>/dev/null || true
npx prisma migrate resolve --applied 20260213143158_add_user_ban_field 2>/dev/null || true
npx prisma migrate resolve --applied 20260219153212_add_user_relations_to_social_models 2>/dev/null || true
npx prisma migrate resolve --applied 20260223140451_add_coach_reviews 2>/dev/null || true
npx prisma migrate resolve --applied 20260223150417_add_comment_likes 2>/dev/null || true
npx prisma migrate resolve --applied 20260227150656_add_certification_pdf_data 2>/dev/null || true

npx prisma migrate deploy
node dist/server.js
