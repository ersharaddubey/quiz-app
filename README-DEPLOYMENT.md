# Quiz App – deployment fixes

## Fixes included
- Removed hard-coded private LAN IP from the mobile API client.
- Admin API now uses `REACT_APP_API_URL` instead of production localhost.
- Added network diagnostics and 30-second API timeouts.
- Added `/api/health` with MongoDB readiness status.
- Backend connects to MongoDB before opening its HTTP port.
- Removed the original `.env` and its default credentials from this ZIP.
- Added environment templates, Vercel SPA rewrite, and Render Blueprint.
- Disabled Android cleartext HTTP traffic.

## Deploy
1. Create MongoDB Atlas database/user and copy its connection string. Configure Atlas Network Access for Render.
2. Deploy backend on Render using `render.yaml` (or root `backend`, build `npm install`, start `npm start`). Set `MONGO_URI`, strong `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CORS_ORIGIN` (exact Vercel URL).
3. Test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`; expect HTTP 200 and `ok: true`, database connected. Free instances can sleep.
4. Create initial admin once with `POST https://YOUR-RENDER-SERVICE.onrender.com/api/auth/setup`. This existing route has no setup-key protection; use strong credentials and disable/remove it after first admin creation.
5. Deploy Vercel with root `admin`, framework Create React App, build `npm run build`, output `build`, env `REACT_APP_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`. Redeploy after env changes.
6. Before production APK build, create `mobile/.env` with `EXPO_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`, then run `cd mobile && npm install && npx expo prebuild --platform android && cd android && ./gradlew assembleDebug`.

Debug APK output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. For Play Store/release distribution, configure a private release keystore first; this project currently uses its generated debug signing setup for release too.

## Local development
Android emulator uses `http://10.0.2.2:5001/api` in Expo development mode. A physical phone needs your Mac LAN IP in `EXPO_PUBLIC_API_URL` while on the same Wi-Fi. Production must use the deployed HTTPS URL. Admin local development defaults to `http://localhost:5001/api`.

## Important scope
This ZIP contains source/configuration changes only. It does not deploy cloud services, create Atlas, or compile an APK. A real backend HTTPS URL must be configured before building a production APK.
