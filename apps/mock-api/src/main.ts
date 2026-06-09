export type MockProduct = {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
};

export const mockProducts: MockProduct[] = [
  {
    id: "p-1001",
    title: "Monitor Demo Hoodie",
    price: 129,
    imageUrl: "/assets/products/hoodie.png"
  },
  {
    id: "p-1002",
    title: "Frontend Observability Mug",
    price: 39,
    imageUrl: "/assets/products/mug.png"
  }
];

export function createMockApiApp() {
  return {
    appName: "mock-api",
    products: mockProducts
  };
}
