import { faker } from "@faker-js/faker";
import { HttpResponse, http } from "msw";

const currency = "USD";

const createProduct = () => {
  const name = faker.commerce.productName();
  const price = Number.parseFloat(faker.commerce.price({ min: 10, max: 400 }));
  const available = faker.number.int({ min: 0, max: 25 });

  return {
    id: faker.string.uuid(),
    name,
    slug: faker.helpers.slugify(name.toLowerCase()),
    description: faker.commerce.productDescription(),
    price: {
      amount: price,
      currency,
    },
    imageUrl: faker.image.urlPicsumPhotos({ width: 640, height: 640 }),
    rating: {
      average: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
      count: faker.number.int({ min: 20, max: 1500 }),
    },
    tags: faker.helpers.arrayElements(["new", "popular", "sale", "eco", "premium", "limited"], {
      min: 1,
      max: 3,
    }),
    inventory: {
      available,
      isInStock: available > 0,
    },
  };
};

const products = faker.helpers.multiple(createProduct, { count: 12 });
const productBySlug = new Map(products.map((product) => [product.slug, product]));

const cartItems = products.slice(0, 3).map((product) => {
  const quantity = faker.number.int({ min: 1, max: 2 });
  return {
    id: faker.string.uuid(),
    product,
    quantity,
    lineTotal: {
      amount: product.price.amount * quantity,
      currency,
    },
  };
});

const cart = {
  id: faker.string.uuid(),
  items: cartItems,
  subtotal: {
    amount: cartItems.reduce((total, item) => total + item.lineTotal.amount, 0),
    currency,
  },
  totalItems: cartItems.reduce((total, item) => total + item.quantity, 0),
  updatedAt: new Date().toISOString(),
};

export const handlers = [
  http.get("*/products", ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase();

    const filtered = search
      ? products.filter((product) =>
          [product.name, product.description, ...product.tags]
            .join(" ")
            .toLowerCase()
            .includes(search),
        )
      : products;

    return HttpResponse.json({ data: filtered });
  }),
  http.get("*/products/:slug", ({ params }) => {
    const slug = params["slug"] as string;
    const product = productBySlug.get(slug);

    if (!product) {
      return HttpResponse.json(
        {
          message: "Product not found",
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(product);
  }),
  http.get("*/cart", () => HttpResponse.json(cart)),
  http.get("*/auth/me", () =>
    HttpResponse.json({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
    }),
  ),
  http.get("*/health", () =>
    HttpResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
  ),
];
