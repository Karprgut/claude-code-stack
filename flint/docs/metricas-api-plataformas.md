# Métricas disponibles vía API · Meta · TikTok · Google

**Referencia técnica para planeación de medición y dashboards**
Válido a inicios de 2026. Cada plataforma actualiza sus APIs varias veces al año — antes de implementar, siempre confirmar en la documentación oficial vigente (Meta Graph API, TikTok Business API, Google Ads API, GA4 Data API, YouTube Analytics API).

---

## META · Facebook + Instagram

Meta expone varias APIs. Las más relevantes para marketing son cuatro: Marketing API (ads pagados), Graph API (páginas de Facebook), Instagram Graph API (contenido orgánico IG Business/Creator), y Conversions API (eventos server-side para cerrar la pérdida de señal por iOS 14+ y pixel blocking).

### Marketing API · Ads Insights

**Entrega y costo**
impressions · reach · frequency · spend · social_spend · cpm · cpc · cpp (costo por 1k personas alcanzadas) · ctr · unique_ctr · unique_clicks · inline_link_clicks · inline_link_click_ctr · outbound_clicks · outbound_clicks_ctr · unique_outbound_clicks

**Acciones y conversiones**
actions (desglosable por action_type: post_engagement, page_engagement, link_click, video_view, lead, landing_page_view, purchase, add_to_cart, initiate_checkout, complete_registration, view_content, add_payment_info, custom events) · action_values (valor monetario de acciones) · conversions · cost_per_action_type · cost_per_conversion · cost_per_inline_link_click · cost_per_inline_post_engagement · cost_per_unique_action_type · cost_per_unique_click · website_purchase_roas · purchase_roas · mobile_app_purchase_roas

**Video**
video_play_actions · video_thruplay_watched_actions · video_15_sec_watched_actions · video_30_sec_watched_actions · video_p25_watched_actions · video_p50_watched_actions · video_p75_watched_actions · video_p95_watched_actions · video_p100_watched_actions · video_avg_time_watched_actions · video_continuous_2_sec_watched_actions

**Calidad del ad (relevancia)**
quality_ranking · engagement_rate_ranking · conversion_rate_ranking · instant_experience_clicks_to_open · instant_experience_clicks_to_start · instant_experience_outbound_clicks

**Metadatos y atribución**
attribution_setting · account_currency · buying_type · objective · optimization_goal · date_start · date_stop · campaign_id · adset_id · ad_id · ad_name

**Breakdowns disponibles**
age · gender · country · region · dma · impression_device · platform_position (feed, stories, reels, etc.) · publisher_platform (facebook, instagram, audience_network, messenger) · device_platform · product_id · action_type · action_target_id · action_destination · action_device · action_video_sound · action_video_type · hourly_stats_aggregated_by_advertiser_time_zone · hourly_stats_aggregated_by_audience_time_zone

### Graph API · Páginas de Facebook

**Alcance y exposición (a nivel página)**
page_impressions · page_impressions_unique · page_impressions_paid · page_impressions_organic · page_impressions_viral · page_impressions_nonviral · page_views_total · page_views_logged_in_total · page_views_external_referrals

**Engagement página**
page_engaged_users · page_post_engagements · page_consumptions · page_consumptions_by_consumption_type · page_negative_feedback · page_fan_adds · page_fan_removes · page_fans (lifetime) · page_fans_locale · page_fans_country · page_fans_city · page_fans_gender_age · page_cta_clicks_logged_in_total

**Video página**
page_video_views · page_video_views_paid · page_video_views_organic · page_video_complete_views_30s · page_video_views_10s · page_video_view_time

**Posts (métricas por publicación)**
post_impressions · post_impressions_unique · post_impressions_paid · post_impressions_organic · post_impressions_fan · post_impressions_viral · post_engaged_users · post_clicks · post_reactions_like_total · post_reactions_love_total · post_reactions_wow_total · post_reactions_haha_total · post_reactions_sorry_total · post_reactions_anger_total · post_negative_feedback · post_video_views · post_video_views_paid · post_video_views_organic · post_video_complete_views_30s · post_video_avg_time_watched · post_video_view_time

### Instagram Graph API · Business / Creator

**Cuenta (account-level insights)**
impressions · reach · profile_views · website_clicks · email_contacts · phone_call_clicks · text_message_clicks · get_directions_clicks · follower_count · online_followers · accounts_engaged · total_interactions · likes · comments · shares · saves · replies · reach_by_follow_type · reach_by_country · reach_by_city · reach_by_age · reach_by_gender · audience_country · audience_city · audience_gender_age · audience_locale

**Media (posts de feed)**
impressions · reach · saved · likes · comments · shares · total_interactions · profile_visits · profile_activity · follows

**Reels**
plays · ig_reels_aggregated_all_plays_count · ig_reels_video_view_total_time · ig_reels_avg_watch_time · reach · likes · comments · shares · saves · total_interactions · reels_interactions

**Stories**
impressions · reach · replies · taps_forward · taps_back · exits · navigation · profile_visits

**Carousels y videos (legacy)**
video_views (deprecado en varias superficies, migrado a plays / impressions según tipo de contenido)

### Conversions API · server-side events

No es para consulta de métricas sino para envío de eventos desde servidor hacia Meta, compensando pérdida por iOS ATT. Eventos estándar disponibles:
PageView · ViewContent · Search · AddToCart · AddToWishlist · InitiateCheckout · AddPaymentInfo · Purchase · Lead · CompleteRegistration · Contact · CustomizeProduct · Donate · FindLocation · Schedule · StartTrial · SubmitApplication · Subscribe · custom events. Una vez enviados aparecen en Ads Insights como actions / conversions.

---

## TIKTOK

TikTok expone dos rutas principales: Marketing API para todo lo pagado (ads, audiencias, conversiones), y Business API (Content Posting + Research API) para contenido orgánico de cuentas Business.

### Marketing API · Ads Reporting

**Performance base**
spend · impressions · clicks · ctr · cpc · cpm · reach · frequency · conversion · conversion_rate · cost_per_conversion · total_conversion · total_conversion_value · result (métrica nativa al objetivo elegido) · result_rate · cost_per_result · real_time_result · real_time_cost_per_result

**Video (ads en formato video)**
video_play_actions · video_watched_2s · video_watched_6s · video_views_p25 · video_views_p50 · video_views_p75 · video_views_p100 · average_video_play · average_video_play_per_user · engaged_view (6s engaged view) · engaged_view_15s

**Engagement ganado sobre el ad**
likes · comments · shares · follows · profile_visits · profile_visits_rate · clicks_on_music_disc · duet_clicks · stitch_clicks

**Interactive Add-Ons (stickers, gift codes, countdown)**
ix_page_duration_avg · ix_page_viewrate_avg · ix_video_views · ix_video_views_p25/p50/p75/p100 · onsite_shopping · onsite_shopping_roas · onsite_add_to_wishlist · onsite_form_views · onsite_form_submission

**Conversiones via Pixel / Events API**
complete_payment · add_to_cart · view_content · add_payment_info · initiate_checkout · registration · subscribe · add_to_wishlist · search · contact · place_an_order · complete_tutorial · achieve_level · custom events

**App events (MMP integrados)**
app_install · purchase · registration · in_app_event_1–10 · achieve_level · complete_tutorial · unlock_achievement · add_to_wishlist

**Ventanas de atribución disponibles**
1d_click · 7d_click · 28d_click · 1d_view · 7d_view

**Breakdowns**
country_code · province_id · dma_id · age · gender · language · platform · placement · placement_type · network_type · interest_category · ad_format · video_id · ad_text · creative_id

### Business API · Research + Content Posting (orgánico)

**Account insights**
follower_count · follower_num_growth · profile_views · video_views (agregado) · likes · comments · shares

**Demográficos audiencia**
follower_gender · follower_age · follower_country · follower_city · follower_active_time · follower_territories

**Video-level insights (por pieza)**
video_views · reach · impressions · average_time_watched · total_time_watched · full_video_watched_rate · likes · comments · shares · total_play_time · impression_sources (For You · Following · Personal Profile · Search · Sound · Hashtag · Others)

---

## GOOGLE

Google tiene ecosistema múltiple. Los cuatro APIs centrales para un equipo de marketing son: Google Ads API (paid search + display + YouTube ads + Performance Max), GA4 Data API (Analytics), YouTube Analytics API (contenido orgánico), y YouTube Data API (metadata y stats públicas).

### Google Ads API

**Métricas de volumen y costo**
impressions · clicks · cost_micros · ctr · average_cpc · average_cpm · average_cpv · average_cost · average_position (deprecado en Search, vivo en otros contextos) · top_impression_percentage · absolute_top_impression_percentage

**Conversiones**
conversions · conversion_value · cost_per_conversion · value_per_conversion · conversion_rate · all_conversions · all_conversions_value · cost_per_all_conversions · all_conversions_value_per_cost · conversions_from_interactions_rate · value_per_all_conversions · cross_device_conversions · view_through_conversions

**Impression share (visibilidad)**
search_impression_share · search_absolute_top_impression_share · search_top_impression_share · search_budget_lost_impression_share · search_budget_lost_absolute_top_impression_share · search_budget_lost_top_impression_share · search_rank_lost_impression_share · search_rank_lost_absolute_top_impression_share · search_rank_lost_top_impression_share · content_impression_share · content_rank_lost_impression_share · content_budget_lost_impression_share · search_click_share

**Interacciones**
interactions · interaction_rate · engagements · engagement_rate

**Video (campañas YouTube)**
video_views · video_view_rate · average_cpv · video_quartile_p25_rate · video_quartile_p50_rate · video_quartile_p75_rate · video_quartile_p100_rate · video_views_p25 · video_views_p50 · video_views_p75 · video_views_p100

**Shopping / PMax**
benchmark_ctr · benchmark_average_max_cpc · relative_ctr · search_click_share (shopping) · search_impression_share (shopping)

**Quality Score y predicciones**
historical_quality_score · historical_landing_page_quality_score · historical_creative_quality_score · historical_search_predicted_ctr

**Atribución por fecha de conversión**
conversions_by_conversion_date · conversions_value_by_conversion_date · all_conversions_by_conversion_date · all_conversions_value_by_conversion_date

**Segments (dimensiones de corte)**
date · week · month · quarter · year · day_of_week · hour · device · ad_network_type · click_type · slot · keyword · search_term_match_type · geo_target_city · geo_target_region · geo_target_metro · geo_target_country · conversion_action · conversion_action_name · conversion_action_category · asset · asset_field_type · product_item_id · product_title · product_brand · product_category_level_1–5

### Google Analytics 4 · Data API

**Usuarios**
activeUsers · totalUsers · newUsers · 1dayActiveUsers · 7dayActiveUsers · 28dayActiveUsers · 30dayActiveUsers · dauPerMau · dauPerWau · wauPerMau

**Sesiones y engagement**
sessions · averageSessionDuration · bounceRate · engagementRate · engagedSessions · userEngagementDuration · eventCount · eventCountPerUser · eventsPerSession · screenPageViews · screenPageViewsPerSession · screenPageViewsPerUser · sessionsPerUser

**Conversiones y valor**
conversions · eventValue · purchaseRevenue · totalRevenue · ecommercePurchases · transactions · transactionsPerPurchaser · averagePurchaseRevenue · averagePurchaseRevenuePerUser · grossPurchaseRevenue · grossItemRevenue · averageRevenuePerUser (ARPU)

**E-commerce / funnel**
addToCarts · checkouts · itemsAddedToCart · itemsCheckedOut · itemsPurchased · itemsViewed · itemRevenue · itemsViewedInPromotion · itemsClickedInPromotion · itemsViewedInList · itemsClickedInList · promotionClicks · promotionViews · purchaseToViewRate · cartToViewRate · addToCartsPerView

**Publisher / Ad**
publisherAdClicks · publisherAdImpressions · totalAdRevenue · advertiserAdClicks · advertiserAdCost · advertiserAdCostPerClick · advertiserAdCostPerConversion · advertiserAdImpressions · returnOnAdSpend (ROAS)

**Cohortes y retención**
cohortActiveUsers · cohortTotalUsers

**Dimensiones más usadas**
date · dateHour · month · week · year · hour · country · region · city · deviceCategory · operatingSystem · browser · sessionSource · sessionMedium · sessionCampaignName · firstUserSource · firstUserMedium · firstUserCampaignName · landingPage · pagePath · pageTitle · pageReferrer · eventName · customEvent:<nombre> · userAgeBracket · userGender · userInterest · audienceName

### YouTube Analytics API · canal y videos (orgánico)

**Volumen y tiempo**
views · estimatedMinutesWatched · averageViewDuration · averageViewPercentage

**Suscriptores y engagement**
subscribersGained · subscribersLost · likes · dislikes · comments · shares

**Cards y end screens**
cardClicks · cardImpressions · cardClickRate · cardTeaserClicks · cardTeaserImpressions · cardTeaserClickRate · annotationClicks · annotationImpressions · annotationClickThroughRate · annotationCloseRate · endScreenElementClicks · endScreenElementImpressions · endScreenElementClickThroughRate

**YouTube Premium**
redViews · redWatchTimeMinutes · estimatedRedMinutesWatched · averageRedViewDuration

**Playlists**
viewsPerPlaylistStart · averageTimeInPlaylist · playlistStarts

**Revenue (requiere monetización y permisos financieros)**
estimatedRevenue · estimatedAdRevenue · estimatedRedPartnerRevenue · grossRevenue · cpm · playbackBasedCpm · adImpressions · monetizedPlaybacks

**Breakdowns**
insightTrafficSourceType (YT_SEARCH · SUGGESTED_VIDEO · BROWSE · PLAYLIST · EXTERNAL · NOTIFICATION · END_SCREEN · CHANNEL · HASHTAGS · SHORTS · NO_LINK_OTHER) · insightTrafficSourceDetail · playbackLocationType (WATCH · EMBEDDED · CHANNEL · MOBILE · EXTERNAL_APP · BROWSE · SEARCH) · deviceType · operatingSystem · subscribedStatus · country · continent · ageGroup · gender · sharingService

### YouTube Data API · metadata y stats públicas

**Canales**
viewCount · subscriberCount · hiddenSubscriberCount · videoCount · commentCount

**Videos**
viewCount · likeCount · dislikeCount (deprecado públicamente, accesible solo al dueño) · favoriteCount · commentCount · duration · definition · caption · licensedContent · projection · regionRestriction

**Playlists**
itemCount

---

## Notas prácticas para planeación

**Ventanas de atribución.** Son el mayor punto de confusión entre plataformas. Meta por default 7d click + 1d view; TikTok por default 7d click + 1d view pero configurable 1/7/28 click y 1/7 view; Google Ads se configura en la vista de atribución y ha migrado mayoritariamente a data-driven desde 2023. Si comparan entre plataformas para reporting consolidado, hay que forzar la misma ventana en todas o las conversiones no cuadran.

**Métricas deprecadas que siguen apareciendo en docs viejos.** Instagram `video_views` migró a `plays` e `impressions` según tipo de contenido; Google Ads `average_position` está deprecado en Search pero sigue vivo en otros contextos; en GA4 ya no existen `bounceRate` y `sessions` con la misma definición que Universal Analytics — la semántica cambió. Vale la pena revisar changelog antes de construir dashboards.

**Rate limits.** Meta Marketing API tiene sus limits por app y por account; TikTok por user access token; Google Ads por operations per day por developer token; GA4 tiene tokens diarios concurrency-limited. Para dashboards con refresh frecuente o muchas cuentas hay que arquitectar caching.

**Conversiones modeladas.** Tanto Meta como Google reportan conversiones modeladas (no observadas directamente) por iOS ATT y cookieless. Aparecen mezcladas con las observadas en los endpoints estándar; para analytics riguroso conviene separarlas donde la API lo permita.

**Custom conversions y custom events.** En las tres plataformas se pueden definir eventos custom; una vez definidos se comportan como métricas estándar en los endpoints. Es la vía para medir lo que no viene de fábrica (p. ej. "lead calificado según score interno").
