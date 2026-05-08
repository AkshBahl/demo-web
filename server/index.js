import express from 'express'
import mongoose from 'mongoose';
import cors from 'cors'
import dotenv from 'dotenv'
import router from './routes/productRoutes.js';
import dummyProducts from './dummyProducts.js';

dotenv.config()

const app = express();

app.use(cors());
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

app.get('/health', (req, res) => {
    const dbState = mongoose.connection?.readyState ?? 0;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    res.status(200).json({
        ok: true,
        db: dbState === 1 ? 'connected' : 'not_connected',
    });
});

const getDummyById = (id) => dummyProducts.find((p) => String(p._id) === String(id));

const applyDummyFilters = (items, query) => {
    const out = [...items];

    const brand = query.brand ? String(query.brand).toLowerCase() : null;
    const category = query.category ? String(query.category).toLowerCase() : null;
    const rating = query.rating ? Number(query.rating) : null;
    const discount = query.discount ? Number(String(query.discount).replace('%', '')) : null;

    let filtered = out;
    if (brand) filtered = filtered.filter((p) => p.brand.toLowerCase().includes(brand));
    if (category) {
        const normalized = category === 'kids' ? 'child' : category === 'unisex' ? 'adult' : category;
        filtered = filtered.filter((p) => p.category.toLowerCase() === normalized);
    }
    if (!Number.isNaN(rating) && rating) filtered = filtered.filter((p) => (p.rating ?? 0) >= rating);
    if (!Number.isNaN(discount) && discount) filtered = filtered.filter((p) => (p.discount ?? 0) >= discount);

    // Handle simple price ranges like "₹0-₹999" or "₹3000+"
    if (query.price) {
        const price = String(query.price);
        if (price.includes('+')) {
            const min = Number(price.replace(/[^\d]/g, ''));
            if (!Number.isNaN(min)) filtered = filtered.filter((p) => (p.sellPrice ?? 0) >= min);
        } else {
            const nums = price.match(/\d+/g)?.map(Number) ?? [];
            if (nums.length >= 2) {
                const [min, max] = nums;
                filtered = filtered.filter((p) => (p.sellPrice ?? 0) >= min && (p.sellPrice ?? 0) <= max);
            }
        }
    }

    return filtered;
};

// If DB isn't available, keep server up and serve dummy data for the APIs the UI uses.
app.use('/api', (req, res, next) => {
    const dbState = mongoose.connection?.readyState ?? 0;
    if (dbState === 1) return next();

    const { method, path } = req;
    if (method !== 'GET') {
        return res.status(503).json({
            message: 'Database is not configured/connected. Set MONGODB_URI in server/.env to enable write APIs.',
        });
    }

    // GET /api
    if (path === '/' || path === '') return res.status(200).json(dummyProducts);

    // GET /api/filter/topRated | /api/filter/bestSellers
    if (path === '/filter/topRated') {
        const top = [...dummyProducts].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 12);
        return res.status(200).json(top);
    }
    if (path === '/filter/bestSellers') {
        const best = [...dummyProducts].sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0)).slice(0, 12);
        return res.status(200).json(best);
    }

    // GET /api/category/:category
    const categoryMatch = path.match(/^\/category\/([^/]+)$/);
    if (categoryMatch) {
        const cat = decodeURIComponent(categoryMatch[1]).toLowerCase();
        const results = dummyProducts.filter((p) => p.category.toLowerCase() === cat);
        return res.status(200).json(results);
    }

    // GET /api/product/:id
    const productMatch = path.match(/^\/product\/([^/]+)$/);
    if (productMatch) {
        const id = decodeURIComponent(productMatch[1]);
        const product = getDummyById(id);
        if (!product) return res.status(404).json({ message: "Product doesn't exist." });
        return res.status(200).json(product);
    }

    // GET /api/products/search?q=...
    if (path === '/products/search') {
        const q = (req.query?.q ? String(req.query.q) : '').trim().toLowerCase();
        if (!q) return res.status(400).json({ message: 'Empty search field' });
        const terms = q.split(/\s+/).filter(Boolean);
        const results = dummyProducts.filter((p) => {
            const hay = `${p.title} ${p.brand} ${p.category}`.toLowerCase();
            return terms.some((t) => hay.includes(t));
        });
        return res.status(200).json(results);
    }

    // GET /api/products/filterBy?... (basic subset)
    if (path === '/products/filterBy') {
        const results = applyDummyFilters(dummyProducts, req.query ?? {});
        if (results.length === 0) return res.status(404).json({ message: 'No products found matching the criteria.' });
        return res.status(200).json(results);
    }

    // GET /api/products/:list (comma-separated ids)
    const listMatch = path.match(/^\/products\/(.+)$/);
    if (listMatch) {
        const list = decodeURIComponent(listMatch[1]);
        const ids = list.split(',').map((s) => s.trim()).filter(Boolean);
        const results = dummyProducts.filter((p) => ids.includes(String(p._id)));
        if (results.length === 0) return res.status(200).json({ message: 'Products not found' });
        return res.status(200).json(results);
    }

    // Unknown dummy route
    return res.status(404).json({ message: 'Not found (dummy API)' });
});

app.use("/api", router);

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.warn('MONGODB_URI not set; starting server without database.');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`App is connected to the database.`)
    } catch (error) {
        console.error(`Error connecting to DB: ${error.message}`);
        console.warn('Starting server without database.');
    }
}

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`App is listening on port ${PORT}`);
        })
    } catch (error) {
        console.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
}
startServer();


