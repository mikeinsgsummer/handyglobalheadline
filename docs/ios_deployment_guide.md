# Guide: Deploying iOS App to the App Store (Mac)

Now that you are on a Mac, the deployment process is straightforward using **Xcode**.

## 1. Prepare Your Assets
Ensure your app icons and splash screens are ready. Capacitor has a tool to generate all sizes:
- Use `@capacitor/assets` to generate icons and splash screens.
- Run: `npx @capacitor/assets generate --ios`

## 2. Sync Your Project
Ensure the native iOS project has your latest web code:
`npx cap sync ios`

## 3. Configuration in Xcode
Run `npx cap open ios` to open the project in Xcode, then:
- **Signing & Capabilities**: Select your **Development Team**. Apple requires an active Apple Developer Program membership ($99/year) for App Store submission.
- **Bundle Identifier**: Ensure it is unique (e.g., `com.yourname.handyglobalheadlines`).
- **Version & Build**: Increment the version (e.g., `2.3.1`) and build number (e.g., `1`) for every new submission.

## 4. Submission Process
1.  **Select Destination**: In the top bar, select **"Any iOS Device (arm64)"**.
2.  **Archive**: Go to **Product > Archive**. This will "bundle" your app.
3.  **Distribute**: Once the archive is finished, the Organizer window will open. Click **"Distribute App"**.
4.  **App Store Connect**: Choose "App Store Connect" and follow the wizard to upload.

## 5. Finalize on App Store Connect
1.  Log in to [App Store Connect](https://appstoreconnect.apple.com/).
2.  Select your app.
3.  Fill in the **Metadata** (Description, Keywords, Support URL).
4.  Upload **Screenshots** for various iPhone/iPad sizes.
5.  Select the **Build** you just uploaded from Xcode.
6.  Click **"Submit for Review"**.

> [!IMPORTANT]
> **App Review** usually takes 24-48 hours. Apple may ask for clarification or request small changes before the app is live.
