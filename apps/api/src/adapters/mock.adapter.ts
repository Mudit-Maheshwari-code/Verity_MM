// ─────────────────────────────────────────────────────────────────────────────
// Mock Adapter — Demo Mode
//
// Provides realistic curated review data for three demo products:
//   1. USB-C Cable     — strong counterfeit signals  (score ~38-45)
//   2. Wireless Earbuds — moderate signals           (score ~62-70)
//   3. Phone Charger   — mostly genuine              (score ~82-88)
//
// Used when searching by product keywords or in demo mode without live tokens.
// isAvailable() always returns true — it is the final fallback.
//
// Exports TWO public methods so the orchestrator can treat the two sources
// (Amazon-mock, Flipkart-mock) as separate source entries in the UI:
//   fetchAmazonReviews(query)  → RawReviewBatch  (sourceId: 'mock-amazon')
//   fetchFlipkartReviews(query) → RawReviewBatch (sourceId: 'mock-flipkart')
// ─────────────────────────────────────────────────────────────────────────────

import { Review } from '@verity/shared';
import { RawReviewBatch } from './base.adapter';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT DATASETS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. USB-C Cable ────────────────────────────────────────────────────────────
// Strong counterfeit signals: explicit fake mentions, packaging issues,
// a cluster of near-identical 5-star unverified bot reviews.

const USB_CABLE_AMAZON: Review[] = [
  // Verified genuine positive
  { id: 'mock-amazon:usbcable-1', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Works great, fast charging', body: 'Bought this for my OnePlus and it charges incredibly fast. Cable feels sturdy and the braided design is nice. Would definitely buy again.', date: '2024-05-10', isVerifiedPurchase: true, helpfulVotes: 23, reviewerHandle: 'TechReviewerIN', flags: [] },
  { id: 'mock-amazon:usbcable-2', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 4, title: 'Good cable for the price', body: 'I have been using it for 2 months now and no issues. Data transfer is fast too. Packaging was decent.', date: '2024-05-15', isVerifiedPurchase: true, helpfulVotes: 11, reviewerHandle: 'Rajesh_K', flags: [] },
  // Counterfeit explicit mentions
  { id: 'mock-amazon:usbcable-3', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'FAKE PRODUCT — DO NOT BUY', body: 'This is clearly a fake counterfeit cable. The branding on the connector is blurry and the cable heats up dangerously. Not genuine at all. Returned immediately.', date: '2024-05-18', isVerifiedPurchase: true, helpfulVotes: 87, reviewerHandle: 'Priya_Consumer', flags: [] },
  { id: 'mock-amazon:usbcable-4', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Not genuine, bootleg copy', body: 'This is a bootleg copy of the original. It does not fast charge at all, just slow charges. The logo looks printed wrong. Nakli product, very disappointed.', date: '2024-05-20', isVerifiedPurchase: true, helpfulVotes: 64, reviewerHandle: 'Ankit_Sharma', flags: [] },
  { id: 'mock-amazon:usbcable-5', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Counterfeit, not the real product', body: 'I compared this with the original brand cable — it is clearly a counterfeit. The insulation is thinner, connectors are different. Original nahi hai yeh.', date: '2024-05-22', isVerifiedPurchase: false, helpfulVotes: 42, reviewerHandle: 'ShopperMumbai', flags: [] },
  // Packaging issues
  { id: 'mock-amazon:usbcable-6', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 2, title: 'No box, generic packaging', body: 'Came in a generic plastic bag with no original box, no manual, no accessories. Looks repackaged. Not what I expected for the price.', date: '2024-05-25', isVerifiedPurchase: true, helpfulVotes: 19, reviewerHandle: 'DelhiDeals', flags: [] },
  { id: 'mock-amazon:usbcable-7', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 2, title: 'Unsealed, packaging different from photos', body: 'The packaging was torn and looked tampered with. Box on listing photos is completely different from what arrived. Packaging different from the listing.', date: '2024-05-28', isVerifiedPurchase: false, helpfulVotes: 33, reviewerHandle: 'VerifyBuyer99', flags: [] },
  // Wrong item
  { id: 'mock-amazon:usbcable-8', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Wrong item received', body: 'I ordered the 3m cable but received a 1m micro-USB cable. Wrong product sent entirely. This is not what I ordered at all.', date: '2024-06-01', isVerifiedPurchase: true, helpfulVotes: 28, reviewerHandle: 'KartikPatel', flags: [] },
  // Bot review cluster — 5 near-identical unverified 5-stars
  { id: 'mock-amazon:usbcable-9', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-05', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'Buyer123', flags: [] },
  { id: 'mock-amazon:usbcable-10', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-05', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'Buyer456', flags: [] },
  { id: 'mock-amazon:usbcable-11', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-06', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'Buyer789', flags: [] },
  { id: 'mock-amazon:usbcable-12', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-06', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'Buyer321', flags: [] },
  { id: 'mock-amazon:usbcable-13', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-07', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'Buyer654', flags: [] },
  // A few more real-looking ones
  { id: 'mock-amazon:usbcable-14', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 3, title: 'Average quality', body: 'Does the job but nothing special. Slow charge on my phone despite being advertised as fast charge. Might be the cable or might be my phone.', date: '2024-06-10', isVerifiedPurchase: true, helpfulVotes: 5, reviewerHandle: 'MidRangeUser', flags: [] },
  { id: 'mock-amazon:usbcable-15', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Not as described, different from photos', body: 'The cable I got looks nothing like the photos. Not as described on the listing. The colour is different and the connector shape is different.', date: '2024-06-12', isVerifiedPurchase: false, helpfulVotes: 17, reviewerHandle: 'AngryCustomer77', flags: [] },
];

const USB_CABLE_FLIPKART: Review[] = [
  { id: 'mock-flipkart:usbcable-1', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Duplicate product, not original', body: 'This is a duplicate item. The original brand has much better build. This is a replica and heats up when charging. Reported to Flipkart already.', date: '2024-05-11', isVerifiedPurchase: true, helpfulVotes: 52, reviewerHandle: 'FK_Shopper_Kiran', flags: [] },
  { id: 'mock-flipkart:usbcable-2', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 2, title: 'Repackaged product', body: 'Came without original box, looks repackaged. No accessories inside, no manual. Not what was shown in the listing photos.', date: '2024-05-17', isVerifiedPurchase: true, helpfulVotes: 31, reviewerHandle: 'SmartShopper_Pune', flags: [] },
  { id: 'mock-flipkart:usbcable-3', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-05', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'FKBuyer111', flags: [] },
  { id: 'mock-flipkart:usbcable-4', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Excellent product highly recommend', body: 'This product is excellent quality and I highly recommend to everyone. Very fast charging and good build quality. Best purchase.', date: '2024-06-07', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'FKBuyer222', flags: [] },
  { id: 'mock-flipkart:usbcable-5', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 4, title: 'Works for basic charging', body: 'Cable works for regular charging. Not super fast but acceptable for the price. Would buy again if price drops further.', date: '2024-05-30', isVerifiedPurchase: true, helpfulVotes: 8, reviewerHandle: 'RegularBuyer_IN', flags: [] },
  { id: 'mock-flipkart:usbcable-6', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Galat product aaya, wrong item', body: 'Alag item aaya hai. Maine Type-C 3m cable order kiya tha, mujhe 1m micro-USB cable mila. Galat product deliver kiya. Return request submit ki hai.', date: '2024-06-02', isVerifiedPurchase: true, helpfulVotes: 44, reviewerHandle: 'HindiReviewer_UP', flags: [] },
  { id: 'mock-flipkart:usbcable-7', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Fake, do not buy', body: 'This is a fake product. I have the original version and this is a knockoff. Quality is very poor, connector wobbles. Do not buy.', date: '2024-06-08', isVerifiedPurchase: false, helpfulVotes: 38, reviewerHandle: 'ExpertReviewer_FK', flags: [] },
  { id: 'mock-flipkart:usbcable-8', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 5, title: 'Best cable in this range', body: 'Great value for money. Cable is long enough and seems durable. Fast charging works on my Samsung. Happy with the purchase.', date: '2024-05-28', isVerifiedPurchase: true, helpfulVotes: 14, reviewerHandle: 'Samsung_Fan_Blore', flags: [] },
  { id: 'mock-flipkart:usbcable-9', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 2, title: 'Not as expected', body: 'Build quality is poor. Feels cheap and the braiding unravels at the connector. Not worth the money.', date: '2024-06-14', isVerifiedPurchase: true, helpfulVotes: 9, reviewerHandle: 'CasualUser_FK', flags: [] },
  { id: 'mock-flipkart:usbcable-10', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 1, title: 'Nakli product, not authentic', body: 'Yeh product nakli lagta hai. Original se bilkul alag hai. Connector thoda loose hai. Waste of money.', date: '2024-06-16', isVerifiedPurchase: false, helpfulVotes: 21, reviewerHandle: 'AngryFK_Buyer', flags: [] },
  { id: 'mock-flipkart:usbcable-11', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 3, title: 'Okay for the price', body: 'Gets the job done. Nothing spectacular. Fast charge does not work as advertised. But price is low so can overlook.', date: '2024-06-18', isVerifiedPurchase: true, helpfulVotes: 3, reviewerHandle: 'Neutral_Buyer', flags: [] },
  { id: 'mock-flipkart:usbcable-12', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'USB-C Fast Charging Cable 3m', rating: 2, title: 'No original packaging', body: 'No box. No accessories. Just the cable in a poly bag. Sealed packaging shown in listing was completely different. No manual, nothing.', date: '2024-06-19', isVerifiedPurchase: false, helpfulVotes: 26, reviewerHandle: 'PackagingChecker', flags: [] },
];

// ── 2. Wireless Earbuds ───────────────────────────────────────────────────────
// Moderate signals: quality inconsistency, mild rating spike, mixed verified ratio

const EARBUDS_AMAZON: Review[] = [
  { id: 'mock-amazon:earbuds-1', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Amazing sound quality!', body: 'Absolutely love these earbuds. The bass is punchy and the highs are clear. ANC works well in metro. Great value for money at this price point.', date: '2024-06-01', isVerifiedPurchase: true, helpfulVotes: 34, reviewerHandle: 'AudiophileIN', flags: [] },
  { id: 'mock-amazon:earbuds-2', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Best earbuds under 2000', body: 'For the price, these are unbeatable. Pairing is instant, audio lag is minimal. Mic quality could be better but overall 5 stars.', date: '2024-06-03', isVerifiedPurchase: true, helpfulVotes: 28, reviewerHandle: 'TechSavvy_Noida', flags: [] },
  { id: 'mock-amazon:earbuds-3', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 2, title: 'Stopped working after 2 weeks', body: 'Left earbud stopped working after exactly 2 weeks. Build quality is extremely poor. Feels cheap and the hinge on the case is already loose. Very disappointing.', date: '2024-06-07', isVerifiedPurchase: true, helpfulVotes: 61, reviewerHandle: 'DisappointedBuyer_AZ', flags: [] },
  { id: 'mock-amazon:earbuds-4', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 1, title: 'Broke in one month', body: 'These broke in less than one month. The right earbud started crackling after 3 weeks and died completely. Build quality is appalling for this brand.', date: '2024-06-10', isVerifiedPurchase: true, helpfulVotes: 47, reviewerHandle: 'PoorQuality_Alert', flags: [] },
  // Mild rating spike — same phrasing, unverified
  { id: 'mock-amazon:earbuds-5', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Great product, very satisfied with purchase', body: 'Great product, very satisfied with purchase. Sound quality is awesome and battery lasts all day. Highly recommended for music lovers.', date: '2024-06-15', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'User_A1', flags: [] },
  { id: 'mock-amazon:earbuds-6', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Great product, very satisfied with purchase', body: 'Great product, very satisfied with purchase. Sound quality is awesome and battery lasts all day. Highly recommended for music lovers.', date: '2024-06-15', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'User_B2', flags: [] },
  { id: 'mock-amazon:earbuds-7', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Great product, very satisfied with purchase', body: 'Great product, very satisfied with purchase. Sound quality is awesome and battery lasts all day. Highly recommended for music lovers.', date: '2024-06-16', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'User_C3', flags: [] },
  { id: 'mock-amazon:earbuds-8', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Great product, very satisfied with purchase', body: 'Great product, very satisfied with purchase. Sound quality is awesome and battery lasts all day. Highly recommended for music lovers.', date: '2024-06-16', isVerifiedPurchase: false, helpfulVotes: 0, reviewerHandle: 'User_D4', flags: [] },
  { id: 'mock-amazon:earbuds-9', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 4, title: 'Good but average build quality', body: 'Sound is good, connection is stable. But build quality feels average — plastic is not premium. Still good for the price.', date: '2024-06-18', isVerifiedPurchase: true, helpfulVotes: 12, reviewerHandle: 'HonestFeedback_IN', flags: [] },
  { id: 'mock-amazon:earbuds-10', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 3, title: 'Mixed feelings', body: 'Audio is decent but the earbuds feel cheap on the touch. One of my friends had the same pair and it fell apart in a month. Hope mine lasts longer.', date: '2024-06-20', isVerifiedPurchase: true, helpfulVotes: 7, reviewerHandle: 'WatchingCarefully', flags: [] },
  { id: 'mock-amazon:earbuds-11', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Perfect for gym use', body: 'Fits well in ear even during workout. No sweat issues. Battery lasts my full gym session and commute. Happy with this.', date: '2024-06-22', isVerifiedPurchase: true, helpfulVotes: 19, reviewerHandle: 'FitnessFreak_AZ', flags: [] },
  { id: 'mock-amazon:earbuds-12', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 2, title: 'Flimsy build, poor quality', body: 'Flimsy build. The earbuds fall out easily. Audio cuts out frequently when phone is in pocket. Build quality is really poor for this price.', date: '2024-06-24', isVerifiedPurchase: true, helpfulVotes: 33, reviewerHandle: 'ReturningThis_AZ', flags: [] },
  { id: 'mock-amazon:earbuds-13', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 4, title: 'Decent for the price', body: 'Honestly decent earbuds for the money. ANC is not the best but the passive isolation is good enough. Bought two pairs already.', date: '2024-06-26', isVerifiedPurchase: true, helpfulVotes: 9, reviewerHandle: 'RepeatBuyer_IN', flags: [] },
  { id: 'mock-amazon:earbuds-14', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 1, title: 'Dead on arrival', body: 'DOA. The right earbud was completely dead out of the box. Charged for 2 hours, nothing. Complete waste. Raise return request immediately.', date: '2024-06-28', isVerifiedPurchase: true, helpfulVotes: 41, reviewerHandle: 'DOA_Report', flags: [] },
  { id: 'mock-amazon:earbuds-15', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'My daily driver now', body: 'These are my daily driver now. I use them 6+ hours a day and battery is still impressive. Highly recommended.', date: '2024-06-30', isVerifiedPurchase: true, helpfulVotes: 16, reviewerHandle: 'DailyUser_IN', flags: [] },
];

const EARBUDS_FLIPKART: Review[] = [
  { id: 'mock-flipkart:earbuds-1', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Value for money!', body: 'Really happy with this purchase. Sound is loud and clear. Fit is comfortable for long sessions. Highly recommended in this budget.', date: '2024-06-02', isVerifiedPurchase: true, helpfulVotes: 22, reviewerHandle: 'FK_AudioFan', flags: [] },
  { id: 'mock-flipkart:earbuds-2', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 3, title: 'Feels cheap but sounds OK', body: 'The plastic feels cheap when you hold it. Build quality is not what you expect for this brand. But the audio is decent enough for everyday use.', date: '2024-06-05', isVerifiedPurchase: true, helpfulVotes: 18, reviewerHandle: 'BudgetAudiophile', flags: [] },
  { id: 'mock-flipkart:earbuds-3', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 2, title: 'Stopped working suddenly', body: 'Both earbuds stopped working after 3 weeks. No drop damage, nothing. Just stopped one morning. Build quality is clearly a problem here.', date: '2024-06-08', isVerifiedPurchase: true, helpfulVotes: 55, reviewerHandle: 'Shocked_Buyer_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-4', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 4, title: 'Nice earbuds for daily use', body: 'Using them for a month now. Good audio, stable Bluetooth, case charges fast. Minor complaint is that mic picks up too much background noise.', date: '2024-06-12', isVerifiedPurchase: true, helpfulVotes: 14, reviewerHandle: 'MonthlyReviewer_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-5', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 1, title: 'Falls apart in weeks', body: 'Falls apart literally. The hinge on my case broke in 2 weeks. The L earbud has no sound now. Complete waste of money.', date: '2024-06-16', isVerifiedPurchase: true, helpfulVotes: 48, reviewerHandle: 'QualityIsssue_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-6', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Superb product for this price', body: 'Superb product for this price range. Sound isolation is good. Would recommend to friends and family without hesitation.', date: '2024-06-18', isVerifiedPurchase: true, helpfulVotes: 11, reviewerHandle: 'HappyFK_Buyer', flags: [] },
  { id: 'mock-flipkart:earbuds-7', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 3, title: 'Average product', body: 'Average earbuds. Nothing special. The sound is okay, battery is passable. Would not buy again at this price.', date: '2024-06-20', isVerifiedPurchase: true, helpfulVotes: 6, reviewerHandle: 'AverageReviewer', flags: [] },
  { id: 'mock-flipkart:earbuds-8', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 4, title: 'Good sound, okay build', body: 'Sound quality is good for this price. Build quality is a bit iffy — I am being careful with it. Hoping it lasts a year at least.', date: '2024-06-22', isVerifiedPurchase: false, helpfulVotes: 8, reviewerHandle: 'CarefulUser_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-9', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 5, title: 'Excellent earphones, very happy', body: 'Excellent earphones. The touch controls are very responsive. Bass is great for hip-hop and EDM. Very happy with this purchase from Flipkart.', date: '2024-06-25', isVerifiedPurchase: true, helpfulVotes: 20, reviewerHandle: 'MusicHead_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-10', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 2, title: 'Poor build quality, not durable', body: 'Not durable at all. Earbuds feel flimsy and the outer coating is already peeling off after 3 weeks. Poor build quality for the price.', date: '2024-06-28', isVerifiedPurchase: true, helpfulVotes: 29, reviewerHandle: 'FeelsCheap_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-11', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 4, title: 'Good deal', body: 'Good deal during the sale. Audio is crisp. Battery easily lasts a day. Will buy again if needed.', date: '2024-06-30', isVerifiedPurchase: true, helpfulVotes: 7, reviewerHandle: 'SaleBuyer_FK', flags: [] },
  { id: 'mock-flipkart:earbuds-12', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'ProSound Wireless Earbuds TWS', rating: 1, title: 'Dead on arrival, very disappointing', body: 'DOA product. Right earbud did not power on at all. Raised return request on Flipkart. Very disappointing for a day-one product failure.', date: '2024-07-02', isVerifiedPurchase: true, helpfulVotes: 37, reviewerHandle: 'DoaReport_FK', flags: [] },
];

// ── 3. Phone Charger ─────────────────────────────────────────────────────────
// Mostly genuine: high verified ratio, consistent positive feedback, 1 quality complaint

const CHARGER_AMAZON: Review[] = [
  { id: 'mock-amazon:charger-1', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Charges my phone incredibly fast', body: 'This 65W GaN charger is fantastic. My phone goes from 0 to 100% in under 45 minutes. The charger stays cool too. Very impressed.', date: '2024-05-05', isVerifiedPurchase: true, helpfulVotes: 45, reviewerHandle: 'GaNFan_India', flags: [] },
  { id: 'mock-amazon:charger-2', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Compact and powerful', body: 'Small size but very powerful. Works with my laptop too at 45W. The USB-C and USB-A combo is very convenient. Highly recommend.', date: '2024-05-08', isVerifiedPurchase: true, helpfulVotes: 39, reviewerHandle: 'MultiBrand_User', flags: [] },
  { id: 'mock-amazon:charger-3', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Genuine product, great charger', body: 'Received sealed original box. All accessories included. Charger works exactly as advertised. Fast charging confirmed on my Pixel. 100% genuine.', date: '2024-05-12', isVerifiedPurchase: true, helpfulVotes: 28, reviewerHandle: 'GooglePixel_User', flags: [] },
  { id: 'mock-amazon:charger-4', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 4, title: 'Very good charger', body: 'Very good charger. Works with all my devices. Only complaint is the cable could be longer. Everything else is perfect. Good buy.', date: '2024-05-16', isVerifiedPurchase: true, helpfulVotes: 17, reviewerHandle: 'MultiDevice_IN', flags: [] },
  { id: 'mock-amazon:charger-5', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Works with MacBook, impressive', body: 'This charges my MacBook Air M2 at full speed. For a ₹1500 charger to do that is impressive. Build quality is solid.', date: '2024-05-20', isVerifiedPurchase: true, helpfulVotes: 53, reviewerHandle: 'MacUser_India', flags: [] },
  { id: 'mock-amazon:charger-6', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'No-nonsense fast charger', body: 'Plug and play. No fuss. Just charges everything quickly. Using it for 3 months now without any issues. Highly recommended.', date: '2024-05-24', isVerifiedPurchase: true, helpfulVotes: 22, reviewerHandle: 'ThreeMonths_User', flags: [] },
  { id: 'mock-amazon:charger-7', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 3, title: 'Good but gets warm', body: 'Does the job. Charges fast but gets noticeably warm when charging laptop and phone simultaneously. Not hot enough to be dangerous, but warm.', date: '2024-05-28', isVerifiedPurchase: true, helpfulVotes: 14, reviewerHandle: 'WarmCharger_Note', flags: [] },
  { id: 'mock-amazon:charger-8', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Best charger I have owned', body: 'Best charger I have ever owned. Replaced my bulky OEM brick with this. Much faster and much more compact. Worth every rupee.', date: '2024-06-01', isVerifiedPurchase: true, helpfulVotes: 31, reviewerHandle: 'BestPurchase2024', flags: [] },
  { id: 'mock-amazon:charger-9', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 4, title: 'Solid build, reliable', body: 'Solid build quality. Has been working flawlessly for 2 months. Prongs fold in nicely for travel. Good purchase.', date: '2024-06-05', isVerifiedPurchase: true, helpfulVotes: 19, reviewerHandle: 'TravelUser_IN', flags: [] },
  { id: 'mock-amazon:charger-10', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Fast, compact, reliable', body: 'Everything you want in a charger — fast, compact, reliable. GaN technology makes a real difference in heat and size.', date: '2024-06-09', isVerifiedPurchase: true, helpfulVotes: 24, reviewerHandle: 'GaN_Convert', flags: [] },
  { id: 'mock-amazon:charger-11', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 2, title: 'Stopped working after 3 months', body: 'Was great for 3 months then stopped recognising my laptop. Phone still charges but laptop PD charging died. Could be a one-off defect.', date: '2024-06-13', isVerifiedPurchase: true, helpfulVotes: 8, reviewerHandle: 'Defect_Report_AZ', flags: [] },
  { id: 'mock-amazon:charger-12', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Superb!', body: 'Superb charger. Fast charging is real and noticeable. Bought for my entire family. Everyone is happy. Recommended without reservation.', date: '2024-06-17', isVerifiedPurchase: true, helpfulVotes: 17, reviewerHandle: 'FamilyBuy_AZ', flags: [] },
  { id: 'mock-amazon:charger-13', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 4, title: 'Good value overall', body: 'Good value for the price. Charges reliably and the folding plug is a nice touch. Wish they included a USB-C cable though.', date: '2024-06-21', isVerifiedPurchase: true, helpfulVotes: 11, reviewerHandle: 'ValueHunter_IN', flags: [] },
  { id: 'mock-amazon:charger-14', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Travel essential', body: 'Travel essential. One charger for all my devices — phone, earbuds, tablet. Saves so much bag space. Would highly recommend to frequent travellers.', date: '2024-06-25', isVerifiedPurchase: true, helpfulVotes: 36, reviewerHandle: 'FrequentFlyer_IN', flags: [] },
  { id: 'mock-amazon:charger-15', sourceId: 'mock-amazon', sourceName: 'Amazon', sourceUrl: 'https://www.amazon.in', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Long-term update — still going strong', body: 'Bought 6 months ago and still working perfectly. No issues. Charges just as fast as day one. Build quality has held up. 5 stars well deserved.', date: '2024-06-29', isVerifiedPurchase: true, helpfulVotes: 44, reviewerHandle: 'SixMonths_Update', flags: [] },
];

const CHARGER_FLIPKART: Review[] = [
  { id: 'mock-flipkart:charger-1', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Brilliant charger', body: 'Brilliant product. Charges my OnePlus in record time. The charger feels premium and the LED indicator is a nice touch.', date: '2024-05-06', isVerifiedPurchase: true, helpfulVotes: 27, reviewerHandle: 'OnePlus_Fan_FK', flags: [] },
  { id: 'mock-flipkart:charger-2', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Perfect for work from home setup', body: 'One charger for my phone, laptop, and earbuds. Perfect for my desk setup. No clutter. Fast charges everything. Very happy.', date: '2024-05-10', isVerifiedPurchase: true, helpfulVotes: 33, reviewerHandle: 'WFH_Setup_FK', flags: [] },
  { id: 'mock-flipkart:charger-3', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 4, title: 'Does what it says', body: 'Does what it says on the tin. Fast charging is genuine. Build is solid. No complaints after 2 months.', date: '2024-05-15', isVerifiedPurchase: true, helpfulVotes: 15, reviewerHandle: 'NoFuss_Buyer_FK', flags: [] },
  { id: 'mock-flipkart:charger-4', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'GaN technology is a game changer', body: 'Switched from a regular charger to this and the size difference alone is worth it. Fast charging is noticeably quicker. GaN is truly a game changer.', date: '2024-05-19', isVerifiedPurchase: true, helpfulVotes: 41, reviewerHandle: 'TechEnthusiast_FK', flags: [] },
  { id: 'mock-flipkart:charger-5', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Exceeded expectations', body: 'Honestly exceeded my expectations. The compact size is deceptive — it is incredibly powerful. Works great with my Samsung S24.', date: '2024-05-23', isVerifiedPurchase: true, helpfulVotes: 22, reviewerHandle: 'Samsung_S24_User', flags: [] },
  { id: 'mock-flipkart:charger-6', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 3, title: 'Average, expected more', body: 'Decent charger. Fast charging works. But I expected the build to be more premium. Plastic feels a bit ordinary for the price point.', date: '2024-05-27', isVerifiedPurchase: true, helpfulVotes: 9, reviewerHandle: 'HighExpectation_FK', flags: [] },
  { id: 'mock-flipkart:charger-7', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Value for money, 5 stars', body: 'Perfect value for money. I have recommended this to 3 friends already. All of them love it. Fast charging is real and battery health is maintained well.', date: '2024-06-01', isVerifiedPurchase: true, helpfulVotes: 18, reviewerHandle: 'ThreeFriends_FK', flags: [] },
  { id: 'mock-flipkart:charger-8', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 4, title: 'Good charger, minor nitpick', body: 'Good charger overall. Minor nitpick — the USB-A port does not support fast charging. But the USB-C does. Happy with the purchase.', date: '2024-06-06', isVerifiedPurchase: true, helpfulVotes: 13, reviewerHandle: 'DetailOriented_FK', flags: [] },
  { id: 'mock-flipkart:charger-9', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Reliable and fast', body: 'Reliable and fast — everything a charger should be. No heating issues, no compatibility problems. Works perfectly with all my devices.', date: '2024-06-11', isVerifiedPurchase: true, helpfulVotes: 24, reviewerHandle: 'ReliableUser_FK', flags: [] },
  { id: 'mock-flipkart:charger-10', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Great product, fast delivery', body: 'Great product and fast delivery by Flipkart. Charger works flawlessly. 10/10 would recommend.', date: '2024-06-16', isVerifiedPurchase: true, helpfulVotes: 8, reviewerHandle: 'QuickDelivery_Fan', flags: [] },
  { id: 'mock-flipkart:charger-11', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 4, title: 'Solid purchase', body: 'Solid purchase. No issues in 3 months. Charges fast and stays relatively cool. Good for daily use.', date: '2024-06-20', isVerifiedPurchase: true, helpfulVotes: 11, reviewerHandle: 'ThreeMonthsFK', flags: [] },
  { id: 'mock-flipkart:charger-12', sourceId: 'mock-flipkart', sourceName: 'Flipkart', sourceUrl: 'https://www.flipkart.com', listingTitle: 'FastCharge 65W GaN Phone Charger', rating: 5, title: 'Highly recommended for iPhone users', body: 'Works perfectly with my iPhone 15. Fast charges via USB-C. Very compact for travel. Box was sealed and genuine. Highly recommended.', date: '2024-06-24', isVerifiedPurchase: true, helpfulVotes: 29, reviewerHandle: 'iPhone15_User_FK', flags: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

type ProductKey = 'cable' | 'earbuds' | 'charger';

function detectProduct(query: string): ProductKey {
  const q = query.toLowerCase();
  if (/cable|usb|usb[-\s]?c|charging cable/i.test(q)) return 'cable';
  if (/earbud|headphone|earphone|tws|wireless ear|airpod/i.test(q)) return 'earbuds';
  return 'charger'; // Default
}

const PRODUCT_TITLES: Record<ProductKey, string> = {
  cable: 'USB-C Fast Charging Cable 3m',
  earbuds: 'ProSound Wireless Earbuds TWS',
  charger: 'FastCharge 65W GaN Phone Charger',
};

const AMAZON_REVIEWS: Record<ProductKey, Review[]> = {
  cable: USB_CABLE_AMAZON,
  earbuds: EARBUDS_AMAZON,
  charger: CHARGER_AMAZON,
};

const FLIPKART_REVIEWS: Record<ProductKey, Review[]> = {
  cable: USB_CABLE_FLIPKART,
  earbuds: EARBUDS_FLIPKART,
  charger: CHARGER_FLIPKART,
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/** Always returns true — mock adapter is the unconditional fallback */
export function isAvailable(): boolean {
  return true;
}

/**
 * Fetch Amazon-sourced mock reviews for the detected product.
 * Returns a RawReviewBatch with sourceId 'mock-amazon'.
 */
export function fetchAmazonReviews(query: string): RawReviewBatch {
  const product = detectProduct(query);
  // Deep-clone to avoid flag mutations across requests
  const reviews = AMAZON_REVIEWS[product].map((r) => ({ ...r, flags: [] as Review['flags'] }));
  return {
    sourceId: 'mock-amazon',
    sourceName: 'Amazon',
    sourceUrl: 'https://www.amazon.in',
    listingTitle: PRODUCT_TITLES[product],
    reviews,
  };
}

/**
 * Fetch Flipkart-sourced mock reviews for the detected product.
 * Returns a RawReviewBatch with sourceId 'mock-flipkart'.
 */
export function fetchFlipkartReviews(query: string): RawReviewBatch {
  const product = detectProduct(query);
  const reviews = FLIPKART_REVIEWS[product].map((r) => ({ ...r, flags: [] as Review['flags'] }));
  return {
    sourceId: 'mock-flipkart',
    sourceName: 'Flipkart',
    sourceUrl: 'https://www.flipkart.com',
    listingTitle: PRODUCT_TITLES[product],
    reviews,
  };
}

/** Convenience: the title of whichever product the query maps to */
export function getMockProductTitle(query: string): string {
  return PRODUCT_TITLES[detectProduct(query)];
}
