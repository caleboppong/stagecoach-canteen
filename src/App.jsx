// Import React hooks used for state, side effects, and memoised filtering
import React, { useEffect, useMemo, useState } from "react";

// Import Supabase client for database, authentication, and storage
import { supabase } from "./supabaseClient";

// Import icons used in the interface
import {
  ShoppingCart,
  Trash2,
  Pencil,
  LogOut,
  UserPlus,
  Upload,
  Shield,
  Send,
  Utensils
} from "lucide-react";

// Import the CSS stylesheet
import "./style.css";

// WhatsApp number used when sending orders
const WHATSAPP_NUMBER = "447834365675";

// Menu categories shown to customers
const categories = [
  "All",
  "Breakfast",
  "Main Meals",
  "Rice Dishes",
  "Sandwiches",
  "Snacks",
  "Drinks",
  "Desserts"
];

// Empty product template used when adding a new menu item
const blankProduct = {
  name: "",
  category: "Main Meals",
  price: "",
  image_url: "",
  stock: "",
  description: "",
  available: true
};

// Formats numbers into British pound currency
function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

// Product form used by the admin to add or edit menu items
function ProductForm({ value, setValue, onSubmit, submitText, files, setFiles }) {
  return (
    <form onSubmit={onSubmit} className="admin-grid">
      {/* Product name input */}
      <input
        className="input"
        placeholder="Meal/product name"
        value={value.name || ""}
        onChange={(e) => setValue({ ...value, name: e.target.value })}
        required
      />

      {/* Product category dropdown */}
      <select
        className="select"
        value={value.category || "Main Meals"}
        onChange={(e) => setValue({ ...value, category: e.target.value })}
      >
        {categories
          .filter((c) => c !== "All")
          .map((c) => (
            <option key={c}>{c}</option>
          ))}
      </select>

      {/* Product price input */}
      <input
        className="input"
        type="number"
        step="0.01"
        placeholder="Price"
        value={value.price || ""}
        onChange={(e) => setValue({ ...value, price: e.target.value })}
        required
      />

      {/* Stock quantity input */}
      <input
        className="input"
        type="number"
        placeholder="Stock quantity"
        value={value.stock || ""}
        onChange={(e) => setValue({ ...value, stock: e.target.value })}
      />

      {/* Optional image URL input */}
      <input
        className="input wide"
        placeholder="Optional image URL"
        value={value.image_url || ""}
        onChange={(e) => setValue({ ...value, image_url: e.target.value })}
      />

      {/* Product description */}
      <textarea
        className="input wide"
        placeholder="Description"
        value={value.description || ""}
        onChange={(e) => setValue({ ...value, description: e.target.value })}
      />

      {/* Availability checkbox */}
      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(value.available)}
          onChange={(e) => setValue({ ...value, available: e.target.checked })}
        />
        Available
      </label>

      {/* Product image upload section */}
      <div className="upload-box wide">
        <b>
          <Upload size={16} /> Upload product images
        </b>

        <p className="muted small">
          Create a public Supabase Storage bucket called <b>canteen-images</b> first.
        </p>

        <input
          className="input"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        {/* Display selected file names */}
        {files.map((file, idx) => (
          <p key={idx} className="muted small">
            {file.name}
          </p>
        ))}
      </div>

      {/* Submit button for adding or updating product */}
      <button className="btn btn-dark" type="submit">
        {submitText}
      </button>
    </form>
  );
}

// Main application component
export default function App() {
  // Stores the logged-in user session
  const [session, setSession] = useState(null);

  // Checks whether the current user is an admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Controls which page tab is shown
  const [tab, setTab] = useState("menu");

  // Controls whether the account page shows login or signup
  const [authMode, setAuthMode] = useState("login");

  // Stores product, order, and admin data from Supabase
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [admins, setAdmins] = useState([]);

  // Stores basket items
  const [cart, setCart] = useState([]);

  // Stores filtering and searching values
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  // Stores form data for adding or editing products
  const [form, setForm] = useState(blankProduct);
  const [editingId, setEditingId] = useState(null);

  // Stores selected upload files
  const [files, setFiles] = useState([]);

  // Stores admin email input
  const [adminEmail, setAdminEmail] = useState("");

  // Stores employee login and signup details
  const [auth, setAuth] = useState({
    email: "",
    password: "",
    fullName: ""
  });

  // Stores customer order details
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    department: "",
    notes: ""
  });

  // Stores success or error messages
  const [message, setMessage] = useState("");

  // Runs when the app first loads
  useEffect(() => {
    // Get the current logged-in session
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Listen for login/logout changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) =>
      setSession(nextSession)
    );

    // Load products when the app opens
    fetchProducts();

    // Stop listening when the component closes
    return () => sub.subscription.unsubscribe();
  }, []);

  // Checks admin status whenever the session changes
  useEffect(() => {
    checkAdmin();
  }, [session]);

  // Loads admin data only after the user has been confirmed as admin
  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchAdmins();
    }
  }, [isAdmin]);

  // Checks if the logged-in user exists in the admins table
  async function checkAdmin() {
    if (!session?.user?.email) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase
      .from("admins")
      .select("email")
      .eq("email", session.user.email.toLowerCase())
      .maybeSingle();

    setIsAdmin(Boolean(data));
  }

  // Fetches all canteen products from Supabase
  async function fetchProducts() {
    const { data, error } = await supabase
      .from("canteen_products")
      .select("*, canteen_product_images(*)")
      .order("created_at", { ascending: false });

    if (!error) {
      setProducts(data || []);
    } else {
      setMessage(error.message);
    }
  }

  // Fetches customer orders for admin dashboard
  async function fetchOrders() {
    const { data, error } = await supabase
      .from("canteen_orders")
      .select("*, canteen_order_items(*)")
      .order("created_at", { ascending: false });

    if (!error) {
      setOrders(data || []);
    } else {
      setMessage(error.message);
    }
  }

  // Fetches all admin accounts
  async function fetchAdmins() {
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setAdmins(data || []);
    } else {
      setMessage(error.message);
    }
  }

  // Filters products by selected category and search text
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const okCategory = category === "All" || p.category === category;
      const okSearch =
        !search ||
        `${p.name || ""} ${p.description || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());

      return okCategory && okSearch;
    });
  }, [products, category, search]);

  // Calculates basket total
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  // Adds a product to the basket
  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((x) => x.id === product.id);

      // Increase quantity if item already exists
      if (found) {
        return prev.map((x) =>
          x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      }

      // Add new item to basket
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  // Increases or decreases basket item quantity
  function changeQty(id, diff) {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, quantity: x.quantity + diff } : x))
        .filter((x) => x.quantity > 0)
    );
  }

  // Uploads product images to Supabase Storage
  async function uploadImages(productId) {
    const urls = [];

    for (const file of files) {
      const cleanFileName = file.name.replace(/\s+/g, "-").toLowerCase();
      const path = `${productId}/${Date.now()}-${cleanFileName}`;

      const { error } = await supabase.storage
        .from("canteen-images")
        .upload(path, file, { upsert: true });

      if (!error) {
        const { data } = supabase.storage
          .from("canteen-images")
          .getPublicUrl(path);

        urls.push(data.publicUrl);
      } else {
        setMessage(error.message);
      }
    }

    // Save uploaded image URLs in product image table
    if (urls.length) {
      await supabase
        .from("canteen_product_images")
        .insert(urls.map((image_url) => ({ product_id: productId, image_url })));
    }

    // Return the first image as the main image
    return urls[0];
  }

  // Adds a new product or updates an existing product
  async function saveProduct(e) {
    e.preventDefault();

    // Stop non-admin users from saving products
    if (!isAdmin) return;

    const payload = {
      ...form,
      price: Number(form.price || 0),
      stock: Number(form.stock || 0)
    };

    let productId = editingId;

    // Update existing product
    if (editingId) {
      const { error } = await supabase
        .from("canteen_products")
        .update(payload)
        .eq("id", editingId);

      if (error) return setMessage(error.message);
    } else {
      // Insert new product
      const { data, error } = await supabase
        .from("canteen_products")
        .insert(payload)
        .select()
        .single();

      if (error) return setMessage(error.message);

      productId = data.id;
    }

    // Upload images after product is saved
    const mainImage = await uploadImages(productId);

    // Set uploaded image as main image if no URL was provided
    if (mainImage && !payload.image_url) {
      await supabase
        .from("canteen_products")
        .update({ image_url: mainImage })
        .eq("id", productId);
    }

    // Reset form after saving
    setForm(blankProduct);
    setEditingId(null);
    setFiles([]);
    fetchProducts();
    setMessage("Saved successfully.");
  }

  // Deletes a product after confirmation
  async function deleteProduct(id) {
    if (confirm("Delete this item?")) {
      const { error } = await supabase.from("canteen_products").delete().eq("id", id);

      if (error) {
        setMessage(error.message);
      } else {
        fetchProducts();
        setMessage("Product deleted successfully.");
      }
    }
  }

  // Places an order and opens WhatsApp with the order message
  async function placeOrder() {
    if (!customer.name || !customer.phone || cart.length === 0) {
      return setMessage("Add your name, phone, and at least one meal.");
    }

    // Save order details
    const { data, error } = await supabase
      .from("canteen_orders")
      .insert({
        user_id: session?.user?.id || null,
        customer_name: customer.name,
        customer_phone: customer.phone,
        department: customer.department,
        notes: customer.notes,
        total_price: total,
        status: "new"
      })
      .select()
      .single();

    if (error) return setMessage(error.message);

    // Save each basket item as an order item
    const { error: itemError } = await supabase.from("canteen_order_items").insert(
      cart.map((item) => ({
        order_id: data.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    );

    if (itemError) return setMessage(itemError.message);

    // Build WhatsApp message text
    const lines = cart
      .map(
        (i) =>
          `• ${i.name} x${i.quantity} = ${money(Number(i.price) * i.quantity)}`
      )
      .join("%0A");

    const text = `Stagecoach Canteen Order%0AName: ${customer.name}%0APhone: ${
      customer.phone
    }%0ADepartment: ${customer.department || "N/A"}%0A%0A${lines}%0A%0ATotal: ${money(
      total
    )}%0ANotes: ${customer.notes || "None"}`;

    // Open WhatsApp so customer can send the order
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");

    // Clear basket and customer form after order
    setCart([]);
    setCustomer({ name: "", phone: "", department: "", notes: "" });
    fetchOrders();
    setMessage("Order saved. WhatsApp has opened for sending.");
  }

  // Creates a new employee account
  async function signup() {
    if (!auth.fullName || !auth.email || !auth.password) {
      return setMessage("Please enter your full name, email, and password.");
    }

    const { error } = await supabase.auth.signUp({
      email: auth.email,
      password: auth.password,
      options: {
        data: { full_name: auth.fullName }
      }
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created successfully. You can now log in.");
      setAuthMode("login");
    }
  }

  // Logs in an existing employee account
  async function login() {
    if (!auth.email || !auth.password) {
      return setMessage("Please enter your email and password to log in.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: auth.email,
      password: auth.password
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged in successfully.");
      setTab("menu");
    }
  }

  // Adds a new admin email
  async function addAdmin(e) {
    e.preventDefault();

    if (!adminEmail) return;

    const { error } = await supabase.from("admins").insert({
      email: adminEmail.toLowerCase(),
      created_by: session.user.email
    });

    setMessage(
      error
        ? error.message
        : "Admin added. They must already have signed up or sign up with this email."
    );

    setAdminEmail("");
    fetchAdmins();
  }

  // Removes admin access from an email
  async function removeAdmin(email) {
    if (confirm(`Remove admin access for ${email}?`)) {
      const { error } = await supabase.from("admins").delete().eq("email", email);

      if (error) {
        setMessage(error.message);
      } else {
        fetchAdmins();
        setMessage("Admin removed successfully.");
      }
    }
  }

  return (
    <>
      {/* Header section */}
      <header className="hero">
        <div className="wrap topbar">
          <div className="brand">
            <img src="/stagecoach-logo.png" alt="Stagecoach Canteen logo" />
            <div>
              <h1>Stagecoach Canteen</h1>
              <p>Employee meal ordering service</p>
            </div>
          </div>

          {/* Navigation buttons */}
          <nav className="nav">
            <button className="btn btn-light" onClick={() => setTab("menu")}>
              Menu
            </button>

            <button className="btn btn-light" onClick={() => setTab("account")}>
              Employee Account
            </button>

            {isAdmin && (
              <button className="btn btn-gold" onClick={() => setTab("admin")}>
                <Shield size={16} /> Admin
              </button>
            )}

            {session && (
              <button className="btn btn-dark" onClick={() => supabase.auth.signOut()}>
                <LogOut size={16} /> Logout
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main page layout */}
      <main className="layout">
        <section className="panel">
          {/* Displays success or error messages */}
          {message && <div className="notice">{message}</div>}

          {/* Menu tab */}
          {tab === "menu" && (
            <>
              <h2>
                <Utensils /> Today’s Menu
              </h2>

              {/* Search input */}
              <input
                className="search"
                placeholder="Search meals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Category filter buttons */}
              <div className="cats">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`chip ${category === c ? "active" : ""}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Product cards */}
              <div className="grid">
                {filteredProducts.map((p) => (
                  <article className="card" key={p.id}>
                    <img
                      src={p.image_url || "/stagecoach-logo.png"}
                      alt={p.name}
                      onError={(e) => {
                        e.currentTarget.src = "/stagecoach-logo.png";
                      }}
                    />

                    <div className="card-body">
                      <div className="row">
                        <h3>{p.name}</h3>

                        <span className={p.available ? "badge ok" : "badge no"}>
                          {p.available ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      <p className="muted small">{p.category}</p>
                      <p>{p.description}</p>
                      <p className="price">{money(p.price)}</p>

                      <button
                        className="btn btn-gold"
                        disabled={!p.available}
                        onClick={() => addToCart(p)}
                      >
                        <ShoppingCart size={16} /> Add meal
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* Employee account tab */}
          {tab === "account" && (
            <div className="auth-box">
              <h2>Employee Account</h2>
              <p className="muted">
                Employees can log in with email and password, or create a new account.
              </p>

              {/* Login and signup switch */}
              <div className="auth-buttons">
                <button
                  type="button"
                  className={authMode === "login" ? "btn btn-dark" : "btn btn-light"}
                  onClick={() => setAuthMode("login")}
                >
                  Login
                </button>

                <button
                  type="button"
                  className={authMode === "signup" ? "btn btn-dark" : "btn btn-light"}
                  onClick={() => setAuthMode("signup")}
                >
                  Sign Up
                </button>
              </div>

              <form className="admin-grid">
                {/* Full name is only shown when creating a new employee account */}
                {authMode === "signup" && (
                  <input
                    className="input"
                    placeholder="Full name"
                    value={auth.fullName}
                    onChange={(e) => setAuth({ ...auth, fullName: e.target.value })}
                  />
                )}

                {/* Email is used for both login and signup */}
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  value={auth.email}
                  onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                />

                {/* Password is used for both login and signup */}
                <input
                  className="input"
                  type="password"
                  placeholder="Password"
                  value={auth.password}
                  onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                />

                {/* Login button only appears in login mode */}
                {authMode === "login" && (
                  <button type="button" className="btn btn-dark" onClick={login}>
                    Login
                  </button>
                )}

                {/* Signup button only appears in signup mode */}
                {authMode === "signup" && (
                  <button type="button" className="btn btn-gold" onClick={signup}>
                    Create Account
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Admin dashboard tab */}
          {tab === "admin" && isAdmin && (
            <div>
              <h2>Admin Dashboard</h2>

              {/* Dashboard statistics */}
              <div className="stats">
                <div className="stat">
                  <b>{products.length}</b>
                  <span> menu items</span>
                </div>

                <div className="stat">
                  <b>{orders.length}</b>
                  <span> orders</span>
                </div>

                <div className="stat">
                  <b>{admins.length}</b>
                  <span> admins</span>
                </div>
              </div>

              {/* Product add/edit form */}
              <h3>{editingId ? "Edit menu item" : "Add menu item"}</h3>

              <ProductForm
                value={form}
                setValue={setForm}
                onSubmit={saveProduct}
                submitText={editingId ? "Update item" : "Add item"}
                files={files}
                setFiles={setFiles}
              />

              {/* Menu management list */}
              <h3>Menu management</h3>

              {products.map((p) => (
                <div className="order-item" key={p.id}>
                  <b>{p.name}</b>
                  <span>{money(p.price)}</span>

                  <button
                    className="icon"
                    onClick={() => {
                      setForm(p);
                      setEditingId(p.id);
                    }}
                  >
                    <Pencil size={16} />
                  </button>

                  <button className="icon danger" onClick={() => deleteProduct(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Admin account management */}
              <h3>Admin accounts</h3>

              <form className="row" onSubmit={addAdmin}>
                <input
                  className="input"
                  placeholder="Admin email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />

                <button className="btn btn-dark">
                  <UserPlus size={16} /> Add admin
                </button>
              </form>

              {admins.map((a) => (
                <div className="order-item" key={a.email}>
                  <b>{a.email}</b>

                  <button className="icon danger" onClick={() => removeAdmin(a.email)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Orders list */}
              <h3>Orders</h3>

              {orders.map((o) => (
                <div className="order-card" key={o.id}>
                  <b>
                    {o.customer_name} — {money(o.total_price)}
                  </b>

                  <p>
                    {o.customer_phone} | {o.department}
                  </p>

                  <p className="muted small">
                    {new Date(o.created_at).toLocaleString()} | {o.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Basket panel */}
        <aside className="panel cart">
          <h2>
            <ShoppingCart /> Basket
          </h2>

          {/* Basket item list */}
          {cart.length === 0 ? (
            <p className="muted">Your basket is empty.</p>
          ) : (
            cart.map((i) => (
              <div className="cart-item" key={i.id}>
                <div>
                  <b>{i.name}</b>
                  <p>{money(i.price)} each</p>

                  <div className="qty">
                    <button onClick={() => changeQty(i.id, -1)}>-</button>
                    <b>{i.quantity}</b>
                    <button onClick={() => changeQty(i.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Basket total */}
          <h3>Total: {money(total)}</h3>

          {/* Customer order details */}
          <input
            className="input"
            placeholder="Your name"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />

          <input
            className="input"
            placeholder="Phone number"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />

          <input
            className="input"
            placeholder="Department / depot"
            value={customer.department}
            onChange={(e) =>
              setCustomer({ ...customer, department: e.target.value })
            }
          />

          <textarea
            className="input"
            placeholder="Notes, allergies, collection time"
            value={customer.notes}
            onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
          />

          {/* Submit order button */}
          <button className="btn btn-green wide-btn" onClick={placeOrder}>
            <Send size={16} /> Send order to WhatsApp
          </button>
        </aside>
      </main>

      {/* Footer */}
      <footer>© {new Date().getFullYear()} Stagecoach Canteen</footer>
    </>
  );
}
