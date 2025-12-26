export const SEED_USERS = [
    { name: "Admin User", email: "admin@toko.com", role: "admin", password: "password123" },
    { name: "Noah Developer", email: "noah@toko.com", role: "admin", password: "password123" },
    { name: "Budi Santoso", email: "budi@example.com", role: "customer", password: "password123" },
    { name: "Siti Aminah", email: "siti@example.com", role: "customer", password: "password123" },
    { name: "Andi Pratama", email: "andi@example.com", role: "customer", password: "password123" },
    { name: "Dewi Lestari", email: "dewi@example.com", role: "customer", password: "password123" },
    { name: "Eko Kurniawan", email: "eko@example.com", role: "customer", password: "password123" },
    { name: "Fajar Nugraha", email: "fajar@example.com", role: "customer", password: "password123" },
    { name: "Gita Pertiwi", email: "gita@example.com", role: "customer", password: "password123" },
    { name: "Hendra Wijaya", email: "hendra@example.com", role: "customer", password: "password123" },
    { name: "Indah Sari", email: "indah@example.com", role: "customer", password: "password123" },
    { name: "Joko Widodo", email: "joko@example.com", role: "customer", password: "password123" }
];

// API Contract: Categories have id, name, slug, description, imageUrl
export const SEED_CATEGORIES = [
    { id: "cat-electronics", name: "Electronics", slug: "electronics", description: "Electronic devices and accessories", imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400" },
    { id: "cat-fashion", name: "Fashion", slug: "fashion", description: "Clothing and accessories", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400" },
    { id: "cat-home-living", name: "Home & Living", slug: "home-living", description: "Home furniture and decor", imageUrl: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400" },
    { id: "cat-beauty", name: "Beauty", slug: "beauty", description: "Beauty and personal care", imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400" },
    { id: "cat-sports", name: "Sports", slug: "sports", description: "Sports equipment", imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400" },
    { id: "cat-toys", name: "Toys", slug: "toys", description: "Toys and games", imageUrl: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400" },
    { id: "cat-books", name: "Books", slug: "books", description: "Books and stationery", imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400" },
    { id: "cat-automotive", name: "Automotive", slug: "automotive", description: "Automotive parts and accessories", imageUrl: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400" },
    { id: "cat-health", name: "Health", slug: "health", description: "Health and wellness", imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400" },
    { id: "cat-garden", name: "Garden", slug: "garden", description: "Garden and outdoor", imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400" }
];

// API Contract: Brands have id, name, slug, logoUrl
export const SEED_BRANDS = [
    { id: "brand-apple", name: "Apple", slug: "apple", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
    { id: "brand-samsung", name: "Samsung", slug: "samsung", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
    { id: "brand-nike", name: "Nike", slug: "nike", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" },
    { id: "brand-adidas", name: "Adidas", slug: "adidas", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg" },
    { id: "brand-ikea", name: "Ikea", slug: "ikea", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Ikea_logo.svg" },
    { id: "brand-dyson", name: "Dyson", slug: "dyson", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/78/Dyson_logo.svg" },
    { id: "brand-lego", name: "Lego", slug: "lego", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/LEGO_logo.svg" },
    { id: "brand-sony", name: "Sony", slug: "sony", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg" },
    { id: "brand-dell", name: "Dell", slug: "dell", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg" },
    { id: "brand-canon", name: "Canon", slug: "canon", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Canon_wordmark.svg" }
];

export const SEED_PRODUCTS = [
    {
        title: "MacBook Pro 14 M3",
        slug: "macbook-pro-14-m3",
        brand: "apple",
        category: "electronics",
        price: 25000000,
        thumbnail: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"
    },
    {
        title: "iPhone 15 Pro",
        slug: "iphone-15-pro",
        brand: "apple",
        category: "electronics",
        price: 20000000,
        thumbnail: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800"
    },
    {
        title: "Samsung Galaxy S24 Ultra",
        slug: "samsung-galaxy-s24",
        brand: "samsung",
        category: "electronics",
        price: 19000000,
        thumbnail: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800"
    },
    {
        title: "Sony WH-1000XM5",
        slug: "sony-wh-1000xm5",
        brand: "sony",
        category: "electronics",
        price: 5000000,
        thumbnail: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800"
    },
    {
        title: "Dell XPS 13",
        slug: "dell-xps-13",
        brand: "dell",
        category: "electronics",
        price: 18000000,
        thumbnail: "https://images.unsplash.com/photo-1593642632823-8f785667771b?w=800"
    },
    {
        title: "Canon EOS R5",
        slug: "canon-eos-r5",
        brand: "canon",
        category: "electronics",
        price: 45000000,
        thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"
    },
    {
        title: "Nike Air Force 1",
        slug: "nike-air-force-1",
        brand: "nike",
        category: "fashion",
        price: 1500000,
        thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"
    },
    {
        title: "Adidas Ultraboost",
        slug: "adidas-ultraboost",
        brand: "adidas",
        category: "fashion",
        price: 2000000,
        thumbnail: "https://images.unsplash.com/photo-1587563871167-1ee7c735c5c3?w=800"
    },
    {
        title: "IKEAS LANDSKRONA Sofa",
        slug: "ikea-landskrona",
        brand: "ikea",
        category: "home-living",
        price: 8000000,
        thumbnail: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
    },
    {
        title: "Dyson V15 Detect",
        slug: "dyson-v15",
        brand: "dyson",
        category: "home-living",
        price: 12000000,
        thumbnail: "https://images.unsplash.com/photo-1558317374-a35498f3ffa2?w=800"
    },
    {
        title: "LEGO Star Wars Millenium Falcon",
        slug: "lego-millenium-falcon",
        brand: "lego",
        category: "toys",
        price: 13000000,
        thumbnail: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800"
    },
    {
        title: "Sony PlayStation 5",
        slug: "sony-ps5",
        brand: "sony",
        category: "electronics",
        price: 9000000,
        thumbnail: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"
    }
];
