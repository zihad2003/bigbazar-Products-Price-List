# 🚀 Deploying your BigBazar MySQL Backend

Since Supabase is currently restricted by bandwidth quotas, this backend will allow your website to continue processing orders and showing products without any interruptions.

## **Step 1: Choose a Hosting Provider**
We recommend **Render** or **Railway** for a 5-minute setup.

### **Option A: Render (Free/Paid Tier)**
1.  **Dashboard**: Go to [dashboard.render.com](https://dashboard.render.com).
2.  **New Resource**: Select **"New + Web Service"**.
3.  **Connect Repo**: Connect your GitHub repository.
4.  **Runtime**: It will automatically detect the **Dockerfile** we just created.
5.  **Environment Variables**: Click **"Advanced"** and add these:
    *   `DB_HOST`: Your hosted MySQL host (e.g. from Aiven, PlanetScale, or a separate Render MySQL instance).
    *   `DB_PORT`: `3306`
    *   `DB_USER`: `root` (or your db user)
    *   `DB_PASSWORD`: `****`
    *   `DB_NAME`: `bigbazar`
    *   `JWT_SECRET`: `any_long_secret_string`
6.  **Deploy**: Click **"Create Web Service"**. It will give you a URL like `https://bigbazar-api.onrender.com`.

### **Option B: Railway (Paid, but very stable)**
1.  **New Project**: Click **"New Project"**.
2.  **MySQL**: Add a **"MySQL"** database first.
3.  **Deploy Code**: Connect your GitHub repo.
4.  **Auto-Link**: Railway will automatically link the MySQL variables to your NodeJS app.

---

## **Step 2: Connect the Website**
Once your API is live and you have your new URL (e.g., `https://bigbazar-api.onrender.com`):

1.  Go to your **Cloudflare Pages Dashboard**.
2.  Select your project -> **Settings** -> **Environment Variables**.
3.  Add/Update **`VITE_API_URL`** to your new backend URL.
4.  **Redeploy** the website.

---

## **🛑 Important: About Images**
Since this backend saves images locally in `server/uploads/`, they will be deleted whenever the server restarts on Render/Railway. 

**Recommended Fixes:**
1.  **Railway Volumes**: Add a "Volume" at `/app/server/uploads` in Railway settings to make images permanent.
2.  **Cloudinary**: I can update the code to use **Cloudinary** for permanent image storage if you prefer.

---

### **Need Help?**
If you have your **MySQL Connection Details** ready, tell me and I will help you configure the environment!
