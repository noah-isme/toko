# 📋 UI/UX API Integration Checklist

> **Tanggal**: 2025-12-07  
> **Status**: Planning Phase  
> **Tujuan**: Menyesuaikan semua UI/UX dengan kontrak API yang sudah diimplementasi

---

## 🎯 Overview

Checklist ini memastikan semua halaman dan komponen UI menggunakan API yang benar sesuai kontrak, menggantikan mock data, dan mengimplementasikan error handling yang proper.

---

## 📱 Pages & Features

### 🔐 **Authentication Pages**

#### `/login` - Login Page

- [ ] **Form Fields**
  - [ ] Email field validation (sesuai API: email string)
  - [ ] Password field (min length sesuai backend requirement)
  - [ ] Remember me checkbox (optional, jika backend support)
- [ ] **API Integration**
  - [ ] Replace mock dengan `useLogin()` hook
  - [ ] Handle response: `{ user, accessToken }`
  - [ ] Store token dengan `setAccessToken()`
  - [ ] Redirect ke halaman sebelumnya atau homepage
- [ ] **Error Handling**
  - [ ] Show error untuk invalid credentials
  - [ ] Show error untuk account locked/suspended
  - [ ] Rate limiting error handling
  - [ ] Network error handling
- [ ] **Loading States**
  - [ ] Disable form saat loading
  - [ ] Show spinner/loading indicator
  - [ ] Disable submit button
- [ ] **Success State**
  - [ ] Show success message (optional)
  - [ ] Auto redirect after login
  - [ ] Merge guest cart if exists

#### `/register` - Register Page

- [ ] **Form Fields**
  - [ ] Name field (required)
  - [ ] Email field (required, valid email)
  - [ ] Password field (min 8 chars, complexity requirements)
  - [ ] Confirm password field
  - [ ] Terms & conditions checkbox
- [ ] **API Integration**
  - [ ] Replace mock dengan `useRegister()` hook
  - [ ] Handle response: `{ user, accessToken }`
  - [ ] Auto login setelah register
  - [ ] Store token
- [ ] **Validation**
  - [ ] Client-side validation untuk semua fields
  - [ ] Password strength indicator
  - [ ] Email format validation
  - [ ] Show API validation errors
- [ ] **Error Handling**
  - [ ] Email already exists error
  - [ ] Validation errors dari backend
  - [ ] Network errors
- [ ] **Success State**
  - [ ] Show welcome message
  - [ ] Redirect to onboarding atau homepage

---

### 🏠 **Homepage & Product Pages**

#### `/` - Homepage

- [ ] **Featured Products Section**
  - [ ] Use `useProducts({ limit: 8 })` untuk featured products
  - [ ] Show loading skeleton saat fetch
  - [ ] Handle empty state
- [ ] **Categories Section**
  - [ ] Use `useCategories()` untuk list categories
  - [ ] Display category cards dengan image & name
  - [ ] Link ke products by category
- [ ] **Brands Section** (Optional)
  - [ ] Use `useBrands()` jika ada brand showcase
  - [ ] Brand logo grid/carousel
- [ ] **Error Handling**
  - [ ] Graceful degradation jika API failed
  - [ ] Retry mechanism
  - [ ] Show error message untuk user

#### `/products` - Product List Page

- [ ] **Product Grid**
  - [ ] Use `useProducts(filters)` dengan pagination
  - [ ] Display product cards: image, title, price, rating
  - [ ] Discount badge jika ada originalPrice
  - [ ] Out of stock badge
- [ ] **Filters** (Sidebar/Top)
  - [ ] Category filter (dari `useCategories()`)
  - [ ] Brand filter (dari `useBrands()`)
  - [ ] Price range filter (min/max slider)
  - [ ] In stock only toggle
  - [ ] Clear all filters button
- [ ] **Search**
  - [ ] Search input dengan debounce
  - [ ] Search query param di URL
  - [ ] Show search results count
- [ ] **Sort Options**
  - [ ] Sort dropdown: price asc/desc, name asc/desc
  - [ ] Update URL query params
- [ ] **Pagination**
  - [ ] Page navigation (prev/next, page numbers)
  - [ ] Show current page & total pages
  - [ ] Items per page selector (20, 40, 60)
- [ ] **Loading & Error States**
  - [ ] Skeleton loaders untuk products
  - [ ] Empty state untuk no results
  - [ ] Error state dengan retry button

#### `/products/[slug]` - Product Detail Page

- [ ] **Product Info**
  - [ ] Use `useProduct(slug)` hook
  - [ ] Display: title, images, price, description
  - [ ] Show originalPrice & discount percent jika ada
  - [ ] Stock status (in stock / out of stock)
  - [ ] Product specifications
  - [ ] Category & brand info
- [ ] **Product Images**
  - [ ] Image gallery dengan thumbnails
  - [ ] Zoom on hover/click
  - [ ] Swipe support untuk mobile
- [ ] **Variants** (if applicable)
  - [ ] Variant selector (size, color, etc)
  - [ ] Update price berdasarkan variant
  - [ ] Show variant stock
- [ ] **Add to Cart**
  - [ ] Quantity selector
  - [ ] Add to cart button
  - [ ] Use `useAddToCart(cartId)` hook
  - [ ] Show success toast
  - [ ] Update cart count di header
  - [ ] Disable jika out of stock
- [ ] **Related Products**
  - [ ] Use `useRelatedProducts(slug)`
  - [ ] Carousel/grid of related items
- [ ] **Reviews Section** (Already implemented)
  - [ ] Verify integration dengan API
  - [ ] Rating & review list
  - [ ] Write review form
- [ ] **Loading & Error States**
  - [ ] Product skeleton loader
  - [ ] 404 page untuk product not found
  - [ ] Error handling untuk API failures

---

### 🛒 **Cart & Checkout Flow**

#### `/cart` - Shopping Cart Page

- [ ] **Cart Items**
  - [ ] Use `useCart(cartId)` hook
  - [ ] Display cart items: image, title, price, qty, subtotal
  - [ ] Quantity controls (+/- buttons)
  - [ ] Use `useUpdateCartItem()` untuk update qty
  - [ ] Use `useRemoveCartItem()` untuk remove item
  - [ ] Show variant info jika ada
- [ ] **Cart Summary**
  - [ ] Subtotal (dari `cart.pricing.subtotal`)
  - [ ] Discount (jika voucher applied)
  - [ ] Tax (estimated)
  - [ ] Shipping (estimated atau "calculated at checkout")
  - [ ] Total
- [ ] **Voucher/Promo Code**
  - [ ] Input field untuk promo code
  - [ ] Apply button
  - [ ] Use `useApplyVoucher()` hook
  - [ ] Show applied voucher dengan discount amount
  - [ ] Remove voucher button
  - [ ] Use `useRemoveVoucher()` hook
  - [ ] Error handling untuk invalid voucher
- [ ] **Empty Cart State**
  - [ ] Empty cart illustration
  - [ ] "Continue Shopping" button
- [ ] **Actions**
  - [ ] Continue shopping button
  - [ ] Proceed to checkout button (disabled jika cart empty)
- [ ] **Loading States**
  - [ ] Show loading saat update quantities
  - [ ] Optimistic updates untuk better UX
- [ ] **Error Handling**
  - [ ] Out of stock errors
  - [ ] Invalid quantity errors
  - [ ] Network errors

#### `/checkout` - Checkout Page

- [ ] **Step 1: Shipping Address**
  - [ ] Use `useAddresses()` untuk list saved addresses
  - [ ] Address selection (radio buttons)
  - [ ] Add new address button
  - [ ] Use AddressBook component (already implemented)
  - [ ] Validation: must select address
- [ ] **Step 2: Shipping Method**
  - [ ] Use `useShippingQuote(cartId)` hook
  - [ ] Pass: destination, courier, weight
  - [ ] Display shipping options: courier, service, cost, ETD
  - [ ] Radio button selection
  - [ ] Show loading saat fetch quotes
- [ ] **Step 3: Payment Method**
  - [ ] Display payment method options
  - [ ] Radio button selection
  - [ ] Payment method icons/logos
  - [ ] Show payment instructions
- [ ] **Order Summary** (Sidebar/Bottom)
  - [ ] Cart items summary (collapsed list)
  - [ ] Subtotal
  - [ ] Discount (if voucher applied)
  - [ ] Shipping cost (from selected option)
  - [ ] Tax (from `useTaxQuote()` if needed)
  - [ ] Final total
- [ ] **Review & Place Order**
  - [ ] Summary of all selections
  - [ ] Terms & conditions checkbox
  - [ ] Place order button
  - [ ] Use `useCheckout()` hook
  - [ ] Request body: cartId, addressId, shipping, payment
- [ ] **Loading States**
  - [ ] Disable form saat processing
  - [ ] Show loading overlay
  - [ ] Progress indicator
- [ ] **Error Handling**
  - [ ] Cart expired error → redirect to cart
  - [ ] Out of stock error → redirect to cart
  - [ ] Payment failed → show error
  - [ ] Address validation errors
- [ ] **Guest Checkout**
  - [ ] Support untuk guest users
  - [ ] Email field untuk order confirmation
  - [ ] Phone number field
  - [ ] Manual address entry

#### `/checkout/review` - Order Review Page

- [ ] **Order Details Preview**
  - [ ] Show semua informasi sebelum confirm
  - [ ] Shipping address
  - [ ] Shipping method
  - [ ] Payment method
  - [ ] Items list
  - [ ] Pricing breakdown
- [ ] **Edit Options**
  - [ ] Back to checkout untuk edit
  - [ ] Change address
  - [ ] Change shipping
  - [ ] Change payment
- [ ] **Confirm Order**
  - [ ] Final confirmation button
  - [ ] Call checkout API
  - [ ] Redirect to success/payment page

#### `/checkout/success` - Order Success Page

- [ ] **Success Message**
  - [ ] Order confirmation message
  - [ ] Order number display
  - [ ] Estimated delivery date
- [ ] **Order Details**
  - [ ] Order summary
  - [ ] Shipping address
  - [ ] Payment info
  - [ ] Receipt/invoice link
- [ ] **Next Steps**
  - [ ] Payment instructions (jika belum dibayar)
  - [ ] Payment link/button
  - [ ] Track order button
  - [ ] Continue shopping button
- [ ] **Email Confirmation**
  - [ ] Show message "email sent to..."
  - [ ] Resend email option (if backend support)

#### `/checkout/failed` - Order Failed Page

- [ ] **Error Message**
  - [ ] Clear explanation of failure
  - [ ] Error code/reason
- [ ] **Recovery Actions**
  - [ ] Try again button
  - [ ] Return to cart button
  - [ ] Contact support link
- [ ] **Cart Restoration**
  - [ ] Ensure cart items still available
  - [ ] Show what caused failure

---

### 👤 **Account Pages**

#### `/account` - Account Dashboard

- [ ] **User Info Section**
  - [ ] Use `useCurrentUser()` hook
  - [ ] Display: name, email, member since
  - [ ] Email verified badge
  - [ ] Edit profile button (if API support)
- [ ] **Quick Actions**
  - [ ] View orders button → `/orders`
  - [ ] Manage addresses button → `/account/addresses`
  - [ ] Favorites button → `/favorites`
  - [ ] Logout button
- [ ] **Recent Orders**
  - [ ] Use `useOrders(1, 5)` untuk recent orders
  - [ ] Mini order cards dengan status
  - [ ] "View all orders" link
- [ ] **Loading & Auth**
  - [ ] Show skeleton loader
  - [ ] Redirect to login jika tidak authenticated
  - [ ] Use AuthProvider context

#### `/account/addresses` - Address Management

- [ ] **Address List**
  - [ ] Already implemented dengan AddressBook
  - [ ] Verify API integration
  - [ ] Test CRUD operations
- [ ] **Features to Verify**
  - [ ] List addresses dengan default badge
  - [ ] Add new address form
  - [ ] Edit address
  - [ ] Delete address dengan confirmation
  - [ ] Set default address
  - [ ] Guest mode support (localStorage)

#### `/orders` - Orders History

- [ ] **Orders List**
  - [ ] Use `useOrders(page)` hook
  - [ ] Display order cards: number, date, status, total, items
  - [ ] Status badge dengan warna (dari `ORDER_STATUS_LABELS`)
  - [ ] Thumbnail image dari first item
- [ ] **Filters** (Optional)
  - [ ] Filter by status dropdown
  - [ ] Date range filter
  - [ ] Search by order number
- [ ] **Pagination**
  - [ ] Page navigation
  - [ ] Load more button (infinite scroll option)
- [ ] **Empty State**
  - [ ] No orders yet message
  - [ ] Start shopping button
- [ ] **Loading & Error**
  - [ ] Skeleton loaders
  - [ ] Error state dengan retry

#### `/orders/[id]` - Order Detail

- [ ] **Order Header**
  - [ ] Order number
  - [ ] Order date
  - [ ] Status badge dengan timeline
  - [ ] Status history dari `order.statusHistory`
- [ ] **Order Items**
  - [ ] List of items dengan image, name, qty, price
  - [ ] Show variant info
  - [ ] Subtotal per item
- [ ] **Shipping Info**
  - [ ] Shipping address dari `order.shippingAddress`
  - [ ] Courier & service
  - [ ] Tracking number (if available)
  - [ ] Track shipment button
- [ ] **Payment Info**
  - [ ] Payment method dari `order.payment.method`
  - [ ] Payment status
  - [ ] Paid date (if paid)
  - [ ] Payment instructions (if pending)
  - [ ] Payment link (if available)
- [ ] **Pricing Breakdown**
  - [ ] Subtotal
  - [ ] Discount (if voucher)
  - [ ] Shipping cost
  - [ ] Tax
  - [ ] Total
- [ ] **Actions**
  - [ ] Cancel order button (if status allows)
  - [ ] Use `useCancelOrder()` hook
  - [ ] Reorder button
  - [ ] Download invoice (if backend support)
  - [ ] Contact support
- [ ] **Track Shipment Modal/Page**
  - [ ] Use `useShipment(orderId)` hook
  - [ ] Show tracking events dari `shipment.tracking`
  - [ ] Timeline visualization
  - [ ] Estimated delivery
  - [ ] Current status
- [ ] **Loading & Error**
  - [ ] Skeleton loader
  - [ ] 404 untuk invalid order ID
  - [ ] Error handling

---

### ❤️ **Favorites Page**

#### `/favorites` - Favorites/Wishlist

- [ ] **Current Implementation**
  - [ ] Verify localStorage-based favorites
  - [ ] Check if needs API integration (if backend has favorites endpoint)
- [ ] **Product Grid**
  - [ ] Display favorited products
  - [ ] Remove from favorites button
  - [ ] Add to cart button
  - [ ] Use `useProducts()` dengan product IDs dari favorites
- [ ] **Empty State**
  - [ ] Empty favorites illustration
  - [ ] Browse products button
- [ ] **Sync with Backend** (If API available)
  - [ ] Migrate from localStorage to API
  - [ ] Sync across devices untuk logged-in users
  - [ ] Guest favorites → merge after login

---

## 🧩 **Shared Components**

### Header/Navigation

- [ ] **Cart Badge**
  - [ ] Use `useCart(cartId)` untuk item count
  - [ ] Real-time update saat add/remove items
  - [ ] Show loading state
- [ ] **User Menu**
  - [ ] Use `useAuth()` context
  - [ ] Show user name jika logged in
  - [ ] Login/Register links jika guest
  - [ ] Account dropdown dengan menu items
  - [ ] Logout button
- [ ] **Search Bar**
  - [ ] Global search dengan debounce
  - [ ] Autocomplete suggestions (if API support)
  - [ ] Search results page integration

### Footer

- [ ] **Newsletter Signup** (If API available)
  - [ ] Email input
  - [ ] Subscribe button
  - [ ] API integration untuk newsletter
  - [ ] Success/error feedback

### Product Card Component

- [ ] **Display**
  - [ ] Product image
  - [ ] Title
  - [ ] Price (originalPrice strikethrough jika ada discount)
  - [ ] Discount badge
  - [ ] Rating stars
  - [ ] Out of stock badge
- [ ] **Actions**
  - [ ] Quick add to cart button
  - [ ] Add to favorites button
  - [ ] Click to product detail
- [ ] **Loading State**
  - [ ] Skeleton loader
  - [ ] Lazy loading images

---

## 🔄 **Global Features**

### Authentication Flow

- [ ] **AuthProvider Integration**
  - [ ] Verify AuthProvider wrapping app
  - [ ] Token refresh logic working
  - [ ] Auto logout on token expiry
  - [ ] Redirect to login untuk protected routes
- [ ] **Guest to User Migration**
  - [ ] Guest cart merge setelah login
  - [ ] Guest favorites migration (if applicable)
  - [ ] Seamless transition

### Cart Management

- [ ] **Cart Store**
  - [ ] Verify Zustand cart store integration
  - [ ] cartId persistence di localStorage
  - [ ] initGuestCart() pada app load
  - [ ] mergeGuestCart() setelah login
- [ ] **Cart Synchronization**
  - [ ] Real-time cart updates across tabs (BroadcastChannel?)
  - [ ] Optimistic updates untuk better UX
  - [ ] Handle cart expired scenarios

### Error Handling

- [ ] **Global Error Boundary**
  - [ ] Catch dan display API errors
  - [ ] User-friendly error messages (dari `getErrorMessage()`)
  - [ ] Retry mechanisms
  - [ ] Report to Sentry
- [ ] **Toast Notifications**
  - [ ] Success toasts untuk actions
  - [ ] Error toasts dengan clear messages
  - [ ] Info toasts untuk tips/warnings
- [ ] **Offline Support**
  - [ ] Detect offline state
  - [ ] Show offline banner
  - [ ] Queue actions untuk retry saat online

### Loading States

- [ ] **Skeleton Loaders**
  - [ ] Product card skeletons
  - [ ] Product detail skeleton
  - [ ] Order list skeletons
  - [ ] Address list skeletons
- [ ] **Spinners & Indicators**
  - [ ] Button loading states
  - [ ] Page loading indicators
  - [ ] Infinite scroll loaders

### SEO & Meta Tags

- [ ] **Dynamic Meta Tags**
  - [ ] Product detail: title, description, image
  - [ ] Category pages: dynamic titles
  - [ ] Og:image untuk social sharing
- [ ] **Structured Data**
  - [ ] Product schema.org markup
  - [ ] Breadcrumbs
  - [ ] Reviews schema

---

## 🧪 **Testing Checklist**

### Manual Testing

- [ ] **Happy Path Testing**
  - [ ] Complete checkout flow dari browse → order success
  - [ ] Register → login → browse → checkout
  - [ ] Guest checkout flow
- [ ] **Error Scenarios**
  - [ ] Network failures
  - [ ] Invalid input handling
  - [ ] Out of stock during checkout
  - [ ] Cart expired
  - [ ] Payment failures
- [ ] **Edge Cases**
  - [ ] Empty states (no products, no orders, etc)
  - [ ] Very long product names/descriptions
  - [ ] Large cart (100+ items)
  - [ ] Voucher edge cases (min spend, expired, etc)

### Browser Testing

- [ ] **Desktop**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] **Mobile**
  - [ ] iOS Safari
  - [ ] Android Chrome
  - [ ] Responsive design all breakpoints

### Performance

- [ ] **Load Times**
  - [ ] Homepage < 2s
  - [ ] Product list < 3s
  - [ ] Product detail < 2s
- [ ] **Optimization**
  - [ ] Image lazy loading
  - [ ] Code splitting
  - [ ] API response caching (React Query)
  - [ ] Debounced search

---

## 📝 **Documentation**

- [ ] **API Integration Guide**
  - [ ] Update README dengan actual API usage examples
  - [ ] Environment variables documentation
  - [ ] API error codes reference
- [ ] **Component Documentation**
  - [ ] Storybook stories (if using Storybook)
  - [ ] Props documentation
  - [ ] Usage examples
- [ ] **Developer Guide**
  - [ ] How to add new API endpoints
  - [ ] How to handle new features
  - [ ] Testing guidelines

---

## 🚀 **Deployment Checklist**

- [ ] **Environment Variables**
  - [ ] `NEXT_PUBLIC_API_URL` configured
  - [ ] Sentry DSN configured
  - [ ] PostHog key configured
- [ ] **Build Verification**
  - [ ] Production build successful
  - [ ] No console errors
  - [ ] All API calls working
- [ ] **Pre-launch**
  - [ ] Remove console.log statements
  - [ ] Remove mock data
  - [ ] Remove TODO comments
  - [ ] SEO meta tags verified
- [ ] **Monitoring**
  - [ ] Sentry error tracking active
  - [ ] Analytics tracking working
  - [ ] API monitoring setup

---

## 📊 **Progress Tracking**

### Priority Levels

- 🔴 **P0 (Critical)**: Must have untuk launch
- 🟡 **P1 (High)**: Important untuk good UX
- 🟢 **P2 (Medium)**: Nice to have
- ⚪ **P3 (Low)**: Future enhancement

### Estimated Timeline

| Phase                    | Tasks                          | Priority | Est. Time |
| ------------------------ | ------------------------------ | -------- | --------- |
| **Phase 1: Auth & Core** | Login, Register, Homepage      | 🔴 P0    | 3-5 days  |
| **Phase 2: Products**    | Product list, detail, search   | 🔴 P0    | 4-6 days  |
| **Phase 3: Cart**        | Cart page, add/update/remove   | 🔴 P0    | 3-4 days  |
| **Phase 4: Checkout**    | Full checkout flow             | 🔴 P0    | 5-7 days  |
| **Phase 5: Account**     | Orders, addresses, profile     | 🟡 P1    | 4-5 days  |
| **Phase 6: Polish**      | Error handling, loading states | 🟡 P1    | 3-4 days  |
| **Phase 7: Testing**     | Manual + E2E testing           | 🟡 P1    | 3-4 days  |

**Total Estimated**: 25-35 days (1-1.5 months)

---

## ✅ **Sign-off**

- [ ] All P0 items completed
- [ ] All P1 items completed
- [ ] Manual testing passed
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Ready for production deployment

---

**Last Updated**: 2025-12-07  
**Maintained By**: Development Team  
**Next Review**: After each sprint/milestone
