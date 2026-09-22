/* Curated Queensland places (editorial picks for the prototype, not live data) */

export const PLACE_CATEGORIES = {
    food:     { label: 'Food',     emoji: '🍽️' },
    cafe:     { label: 'Café',     emoji: '☕' },
    sight:    { label: 'Sights',   emoji: '🏛️' },
    nature:   { label: 'Nature',   emoji: '🌿' },
    shopping: { label: 'Shopping', emoji: '🛍️' }
};

export const PLACES = [
    // Brisbane
    { id: 'south-bank', name: 'South Bank Parklands', city: 'Brisbane', area: 'South Brisbane', category: 'nature', rating: 4.8, emoji: '🌳', blurb: 'Riverside parklands with Streets Beach, a free man-made lagoon in the city.' },
    { id: 'qagoma', name: 'QAGOMA', city: 'Brisbane', area: 'South Brisbane', category: 'sight', rating: 4.7, emoji: '🖼️', blurb: 'Queensland Art Gallery and Gallery of Modern Art. Free general entry.' },
    { id: 'qld-museum', name: 'Queensland Museum', city: 'Brisbane', area: 'South Brisbane', category: 'sight', rating: 4.6, emoji: '🦕', blurb: 'Natural history, dinosaurs and hands-on science. A great rainy-day pick.' },
    { id: 'lone-pine', name: 'Lone Pine Koala Sanctuary', city: 'Brisbane', area: 'Fig Tree Pocket', category: 'nature', rating: 4.7, emoji: '🐨', blurb: 'Koalas, kangaroos and platypus. Reachable by a river cruise from the CBD.' },
    { id: 'mt-coot-tha', name: 'Mt Coot-tha Lookout', city: 'Brisbane', area: 'Mount Coot-tha', category: 'nature', rating: 4.6, emoji: '🌄', blurb: 'The best panorama of the city skyline, especially at sunset.' },
    { id: 'story-bridge', name: 'Story Bridge Climb', city: 'Brisbane', area: 'Kangaroo Point', category: 'sight', rating: 4.8, emoji: '🌉', blurb: 'Guided climb over Brisbane\'s heritage-listed cantilever bridge.' },
    { id: 'kp-cliffs', name: 'Kangaroo Point Cliffs', city: 'Brisbane', area: 'Kangaroo Point', category: 'nature', rating: 4.7, emoji: '🧗', blurb: 'River views, picnic spots and floodlit rock climbing.' },
    { id: 'howard-smith', name: 'Howard Smith Wharves', city: 'Brisbane', area: 'Brisbane City', category: 'food', rating: 4.6, emoji: '🍻', blurb: 'Riverfront dining and drinks right under the Story Bridge.' },
    { id: 'eat-street', name: 'Eat Street Northshore', city: 'Brisbane', area: 'Hamilton', category: 'food', rating: 4.4, emoji: '🌮', blurb: 'Shipping-container night market with street food and live music on weekends.' },
    { id: 'fish-lane', name: 'Fish Lane', city: 'Brisbane', area: 'South Brisbane', category: 'food', rating: 4.5, emoji: '🍜', blurb: 'Laneway of street art, small bars and restaurants.' },
    { id: 'james-st', name: 'James Street', city: 'Brisbane', area: 'Fortitude Valley', category: 'shopping', rating: 4.5, emoji: '👜', blurb: 'Boutique fashion, homewares and leafy dining.' },
    { id: 'queen-st', name: 'Queen Street Mall', city: 'Brisbane', area: 'Brisbane City', category: 'shopping', rating: 4.3, emoji: '🛍️', blurb: 'The CBD\'s main pedestrian shopping strip.' },
    { id: 'botanic-gardens', name: 'City Botanic Gardens', city: 'Brisbane', area: 'Brisbane City', category: 'nature', rating: 4.6, emoji: '🌺', blurb: 'Heritage gardens on the river bend, next to QUT Gardens Point.' },
    { id: 'powerhouse', name: 'Brisbane Powerhouse', city: 'Brisbane', area: 'New Farm', category: 'sight', rating: 4.5, emoji: '🎭', blurb: 'Former power station turned arts venue, beside New Farm Park.' },
    { id: 'citycat', name: 'CityCat Ferry', city: 'Brisbane', area: 'Brisbane River', category: 'sight', rating: 4.7, emoji: '⛴️', blurb: 'The cheapest river cruise in town. Ride end to end for the views.' },
    { id: 'west-end-cafes', name: 'West End Cafés', city: 'Brisbane', area: 'West End', category: 'cafe', rating: 4.5, emoji: '☕', blurb: 'Boundary Street\'s independent coffee spots and brunch places.' },
    { id: 'paddington-cafes', name: 'Paddington Cafés', city: 'Brisbane', area: 'Paddington', category: 'cafe', rating: 4.4, emoji: '🥐', blurb: 'Brunch along Given Terrace among the old Queenslander houses.' },

    // Gold Coast
    { id: 'surfers-beach', name: 'Surfers Paradise Beach', city: 'Gold Coast', area: 'Surfers Paradise', category: 'nature', rating: 4.6, emoji: '🏖️', blurb: 'The Gold Coast\'s famous patrolled beach, steps from the high-rises.' },
    { id: 'skypoint', name: 'SkyPoint Observation Deck', city: 'Gold Coast', area: 'Surfers Paradise', category: 'sight', rating: 4.5, emoji: '🏙️', blurb: 'Coastline views from level 77 of the Q1 tower.' },
    { id: 'burleigh-np', name: 'Burleigh Head National Park', city: 'Gold Coast', area: 'Burleigh Heads', category: 'nature', rating: 4.8, emoji: '🌊', blurb: 'Easy headland walk with surf breaks below and whale sightings in winter.' },
    { id: 'currumbin', name: 'Currumbin Wildlife Sanctuary', city: 'Gold Coast', area: 'Currumbin', category: 'nature', rating: 4.6, emoji: '🦜', blurb: 'Native animals, a wildlife hospital and rainbow lorikeet feeding.' },
    { id: 'springbrook', name: 'Springbrook National Park', city: 'Gold Coast', area: 'Hinterland', category: 'nature', rating: 4.8, emoji: '💧', blurb: 'Rainforest waterfalls and the glow worms of the Natural Bridge.' },
    { id: 'miami-marketta', name: 'Miami Marketta', city: 'Gold Coast', area: 'Miami', category: 'food', rating: 4.5, emoji: '🍢', blurb: 'Street-food night market with live music in an old warehouse.' },
    { id: 'pacific-fair', name: 'Pacific Fair', city: 'Gold Coast', area: 'Broadbeach', category: 'shopping', rating: 4.4, emoji: '🛍️', blurb: 'The coast\'s largest shopping centre, next to the light rail.' },
    { id: 'burleigh-cafes', name: 'Burleigh Cafés', city: 'Gold Coast', area: 'Burleigh Heads', category: 'cafe', rating: 4.6, emoji: '☕', blurb: 'Beachside coffee and brunch around James Street, Burleigh.' },
    { id: 'sea-world', name: 'Sea World', city: 'Gold Coast', area: 'Main Beach', category: 'sight', rating: 4.3, emoji: '🐬', blurb: 'Marine park with rides and animal presentations on The Spit.' },

    // Sunshine Coast
    { id: 'noosa-np', name: 'Noosa National Park', city: 'Sunshine Coast', area: 'Noosa Heads', category: 'nature', rating: 4.9, emoji: '🌴', blurb: 'Coastal walk past secluded bays. Look out for koalas and dolphins.' },
    { id: 'hastings-st', name: 'Hastings Street', city: 'Sunshine Coast', area: 'Noosa Heads', category: 'shopping', rating: 4.5, emoji: '🕶️', blurb: 'Boutiques and restaurants a block from Noosa Main Beach.' },
    { id: 'australia-zoo', name: 'Australia Zoo', city: 'Sunshine Coast', area: 'Beerwah', category: 'nature', rating: 4.7, emoji: '🐊', blurb: 'The Irwin family\'s famous zoo with daily crocodile shows.' },
    { id: 'mooloolaba-beach', name: 'Mooloolaba Beach', city: 'Sunshine Coast', area: 'Mooloolaba', category: 'nature', rating: 4.7, emoji: '🏝️', blurb: 'Calm, north-facing beach that suits families and swimmers.' },
    { id: 'eumundi', name: 'Eumundi Markets', city: 'Sunshine Coast', area: 'Eumundi', category: 'shopping', rating: 4.6, emoji: '🧺', blurb: 'Artisan market with handmade goods and food stalls, Wednesdays and Saturdays.' },
    { id: 'glass-house', name: 'Glass House Mountains Lookout', city: 'Sunshine Coast', area: 'Glass House Mountains', category: 'nature', rating: 4.6, emoji: '⛰️', blurb: 'Views over volcanic peaks with short bushwalks nearby.' },
    { id: 'mooloolaba-cafes', name: 'Mooloolaba Esplanade Cafés', city: 'Sunshine Coast', area: 'Mooloolaba', category: 'cafe', rating: 4.4, emoji: '🧁', blurb: 'Ocean-view breakfasts along the Esplanade.' },
    { id: 'everglades', name: 'Noosa Everglades', city: 'Sunshine Coast', area: 'Boreen Point', category: 'nature', rating: 4.8, emoji: '🛶', blurb: 'Kayak the "river of mirrors" through quiet wetlands.' },

    // Cairns
    { id: 'reef-trip', name: 'Great Barrier Reef Day Trip', city: 'Cairns', area: 'Outer Reef', category: 'nature', rating: 4.9, emoji: '🐠', blurb: 'Snorkel or dive the outer reef on a full-day boat trip.' },
    { id: 'cairns-lagoon', name: 'Cairns Esplanade Lagoon', city: 'Cairns', area: 'Cairns City', category: 'nature', rating: 4.6, emoji: '🏊', blurb: 'Free saltwater swimming lagoon on the waterfront.' },
    { id: 'kuranda-rail', name: 'Kuranda Scenic Railway', city: 'Cairns', area: 'Kuranda', category: 'sight', rating: 4.7, emoji: '🚂', blurb: 'Heritage train through rainforest gorges to the village of Kuranda.' },
    { id: 'cairns-night-markets', name: 'Cairns Night Markets', city: 'Cairns', area: 'Cairns City', category: 'food', rating: 4.2, emoji: '🍡', blurb: 'Food court, souvenirs and massages every evening.' }
];

const BY_ID = new Map(PLACES.map(p => [p.id, p]));

export function placeById(id) { return BY_ID.get(id); }

export function placesForCity(city) {
    const q = String(city || '').trim().toLowerCase();
    if (!q) return [];
    return PLACES.filter(p => p.city.toLowerCase() === q || q.includes(p.city.toLowerCase()) || p.city.toLowerCase().includes(q));
}

export const PLACE_CITIES = [...new Set(PLACES.map(p => p.city))];
