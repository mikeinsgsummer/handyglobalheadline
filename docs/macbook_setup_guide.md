# MacBook Setup Guide for iOS Deployment

To move your work from the Windows PC to your MacBook and build for iOS, follow these steps:

## 1. Transfer the Project
The easiest way is to copy the entire project folder:
- **Zip the folder** on Windows: `country-news-mobile app`.
- **Transfer it** via a USB drive, AirDrop (if using a bridge), or a cloud service like Google Drive/Dropbox.
- **Unzip** it on your MacBook.

> [!TIP]
> **Don't copy `node_modules`!** It's better to delete the `node_modules` folder before zipping to save space and time. You will re-install them on the Mac.

---

## 2. Prepare the MacBook Environment
You need to install these tools on your Mac (if not already there):

### **A. Install Node.js & NPM**
Download and install the **LTS version** from [nodejs.org](https://nodejs.org/).

### **B. Install Xcode**
Download it from the **Mac App Store**. This is the essential tool for building iOS apps. 
- After installing, open Xcode once to accept the license agreement and let it install "Additional Components."

### **C. Install CocoaPods**
Capacitor uses CocoaPods to manage iOS dependencies. Open the **Terminal** on your Mac and run:
```bash
sudo gem install cocoapods
```

---

## 3. Launching the App on Mac
Once your environment is ready, open the **Terminal**, navigate to your project folder, and run:

```bash
# 1. Install dependencies
npm install

# 2. Sync the project (installs iOS pods)
npx cap sync

# 3. Open in Xcode
npx cap open ios
```

---

## 4. In Xcode (To build and run)
1.  Select your target (e.g., your iPhone or a Simulator) at the top.
2.  Go to the **Signing & Capabilities** tab.
3.  Add a **Team** (you'll need to sign into your Apple ID).
4.  Press the **Play** button (top left) to build and run!

> [!IMPORTANT]
> To submit to the App Store, you will eventually need a paid **Apple Developer Program** account ($99/year). For local testing on your own device, a free Apple ID is sufficient.
