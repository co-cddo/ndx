# Local Try Feature Development Setup

**Purpose:** This guide provides complete setup instructions for developing the Try Before You Buy feature locally using mitmproxy.

**Audience:** NDX developers working on the Try feature implementation

**Scope:** Local development infrastructure only (not production deployment)

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Installation](#installation)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
- [System Proxy Configuration](#system-proxy-configuration)
  - [macOS Proxy Setup](#macos-proxy-setup)
  - [Windows Proxy Setup](#windows-proxy-setup)
  - [Linux Proxy Setup (GNOME)](#linux-proxy-setup-gnome)
  - [Alternative: Browser-Specific Proxy](#alternative-browser-specific-proxy)
  - [Disabling the Proxy](#disabling-the-proxy)
- [Certificate Trust Setup](#certificate-trust-setup)
  - [Certificate Generation and Location](#certificate-generation-and-location)
  - [macOS Certificate Trust](#macos-certificate-trust)
  - [Windows Certificate Trust](#windows-certificate-trust)
  - [Linux Certificate Trust](#linux-certificate-trust)
  - [Firefox-Specific Certificate Trust](#firefox-specific-certificate-trust)
  - [Security Considerations](#security-considerations)
  - [Removing Certificate Trust](#removing-certificate-trust)
- [Troubleshooting](#troubleshooting)
  - [Proxy Configuration Issues](#proxy-configuration-issues)
- [Validation](#validation)

---

## Overview

The Try Before You Buy feature enables local UI development with real Innovation Sandbox API integration. This setup uses **mitmproxy** as a transparent proxy to route requests:

- **UI routes** (`/`, `/catalogue/*`, `/try`, `/assets/*`) → `localhost:8080` (local NDX server)
- **API routes** (`/api/*`) → CloudFront (`d7roov8fndsis.cloudfront.net` - real Innovation Sandbox backend)

**Benefits:**
- **Production Parity:** Real Innovation Sandbox API testing (authentication, leases, AUP)
- **Fast Iteration:** Local UI changes hot-reload without rebuilding CloudFront distribution
- **No Backend Mocking:** OAuth redirects, JWT tokens, API responses all production-authentic

**Why This Approach:**
The Innovation Sandbox CloudFront distribution cannot be modified (external system). mitmproxy enables local UI development while preserving OAuth flows and API behavior.

---

## Prerequisites

### Required Dependencies

| Dependency | Version | Installation |
|------------|---------|--------------|
| **Python** | 3.8+ | [macOS](#macos) \| [Windows](#windows) \| [Linux](#linux) |
| **mitmproxy** | 10.x+ (latest stable) | `pip install mitmproxy` |
| **Node.js** | 20.17.0 | See [development-guide.md](../development-guide.md) |
| **Yarn** | 4.5.0 | See [development-guide.md](../development-guide.md) |

### Port Availability

Ensure these ports are available:
- **Port 8080:** NDX Eleventy development server
- **Port 8081:** mitmproxy listener

**Check port availability:**
```bash
# macOS/Linux
lsof -Pi :8080
lsof -Pi :8081

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 8080
Get-NetTCPConnection -LocalPort 8081
```

If ports are in use, see [Troubleshooting - Port Conflicts](#port-already-in-use).

---

## Architecture

### Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│              (Navigate to CloudFront domain)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     mitmproxy (localhost:8081)                   │
│                  [Conditional Routing Addon]                     │
└─────────────┬───────────────────────────────┬───────────────────┘
              │                               │
    UI Routes │                               │ API Routes
    (/,/catalogue/*,                          │ (/api/*)
     /try,/assets/*)                          │
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌────────────────────────────────┐
│ localhost:8080           │    │ d7roov8fndsis.cloudfront.net   │
│ (NDX Eleventy Server)    │    │ (Innovation Sandbox Backend)   │
│                          │    │                                │
│ - Local UI changes       │    │ - OAuth authentication         │
│ - Hot-reload workflow    │    │ - API requests (leases, AUP)   │
│ - Static HTML/CSS/JS     │    │ - Real backend responses       │
└──────────────────────────┘    └────────────────────────────────┘
```

### Key Design Principles

- **Transparent Proxy:** Intercepts specific CloudFront domain only (not all traffic)
- **OAuth Preservation:** CloudFront domain maintained for OAuth callbacks
- **Production Parity:** Same API security and authentication as production
- **Minimal Configuration:** One-time setup per developer machine

---

## Installation

### macOS

#### Step 1: Install Python 3.8+

Python 3 is pre-installed on macOS 10.15+ (Catalina and later).

**Check Python version:**
```bash
python3 --version
# Expected: Python 3.8.0 or higher
```

**If Python is missing or outdated, install via Homebrew:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.11
```

#### Step 2: Install mitmproxy

```bash
# Install mitmproxy via pip
pip3 install mitmproxy

# Or use Homebrew
brew install mitmproxy
```

#### Step 3: Verify Installation

```bash
mitmproxy --version
# Expected: Mitmproxy 10.x.x or higher
```

#### Next Steps

1. **Start mitmproxy:**
   ```bash
   yarn dev:proxy
   ```
   This starts mitmproxy on port 8081 with the addon script loaded. To stop the proxy, press `q` in the mitmproxy console.

2. **Configure system proxy:** See [System Proxy Configuration](#system-proxy-configuration) for macOS proxy setup
3. **Trust SSL certificate:** See [Certificate Trust Setup](#certificate-trust-setup) for certificate trust instructions

---

### Windows

#### Step 1: Install Python 3.8+

**Download and install Python from [python.org](https://www.python.org/downloads/):**

1. Download latest Python 3.x installer (Windows installer 64-bit)
2. Run installer
3. **IMPORTANT:** Check "Add Python to PATH" during installation
4. Click "Install Now"

**Verify installation:**
```powershell
python --version
# Expected: Python 3.8.0 or higher
```

#### Step 2: Install mitmproxy

```powershell
# Install mitmproxy via pip
pip install mitmproxy
```

#### Step 3: Verify Installation

```powershell
mitmproxy --version
# Expected: Mitmproxy 10.x.x or higher
```

#### Next Steps

1. **Start mitmproxy:**
   ```powershell
   yarn dev:proxy
   ```
   This starts mitmproxy on port 8081 with the addon script loaded. To stop the proxy, press `q` in the mitmproxy console.

2. **Configure system proxy:** See [System Proxy Configuration](#system-proxy-configuration) for Windows proxy setup
3. **Trust SSL certificate:** See [Certificate Trust Setup](#certificate-trust-setup) for certificate trust instructions

---

### Linux

#### Step 1: Install Python 3.8+

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install Python 3.8+
sudo apt install python3 python3-pip
```

**Fedora/RHEL:**
```bash
# Install Python 3.8+
sudo dnf install python3 python3-pip
```

**Arch Linux:**
```bash
# Install Python 3.8+
sudo pacman -S python python-pip
```

**Verify installation:**
```bash
python3 --version
# Expected: Python 3.8.0 or higher
```

#### Step 2: Install mitmproxy

```bash
# Install mitmproxy via pip
pip3 install mitmproxy

# Or install via package manager (if available)
# Ubuntu/Debian
sudo apt install mitmproxy

# Arch Linux
sudo pacman -S mitmproxy
```

#### Step 3: Verify Installation

```bash
mitmproxy --version
# Expected: Mitmproxy 10.x.x or higher
```

#### Next Steps

1. **Start mitmproxy:**
   ```bash
   yarn dev:proxy
   ```
   This starts mitmproxy on port 8081 with the addon script loaded. To stop the proxy, press `q` in the mitmproxy console.

2. **Configure system proxy:** See [System Proxy Configuration](#system-proxy-configuration) for Linux system proxy configuration
3. **Trust SSL certificate:** See [Certificate Trust Setup](#certificate-trust-setup) for certificate trust instructions

---

## System Proxy Configuration

**Purpose:** Configure your operating system to route browser traffic through mitmproxy on localhost:8081.

**Why This is Needed:** The system proxy intercepts all browser requests to the CloudFront domain and routes them to mitmproxy. The mitmproxy addon script then conditionally forwards UI requests to your local NDX server (localhost:8080) while passing API requests through to the real CloudFront backend unchanged.

**Security Note:** System proxy configuration only affects your local machine during development. Disable the proxy when not actively developing Try features to restore normal internet access.

---

### macOS Proxy Setup

**Step 1: Open Network Settings**

1. Open **System Settings** (macOS 13 Ventura and later) or **System Preferences** (macOS 12 Monterey and earlier)
2. Navigate to **Network**
3. Select your active network connection (Wi-Fi or Ethernet - look for the green dot indicating "Connected")
4. Click **Details** (macOS 13+) or **Advanced** (macOS 12-)

**Step 2: Configure HTTP/HTTPS Proxy**

1. Click the **Proxies** tab
2. Check **Web Proxy (HTTP)**
   - **Web Proxy Server:** `localhost`
   - **Port:** `8081`
3. Check **Secure Web Proxy (HTTPS)**
   - **Secure Web Proxy Server:** `localhost`
   - **Port:** `8081`

**Step 3: Configure Bypass List**

In the **Bypass proxy settings for these Hosts & Domains** field, add:

```
localhost, 127.0.0.1, *.local
```

**Why bypass list is critical:** Without this list, requests to localhost (including the local NDX server on port 8080) would be proxied through mitmproxy again, causing infinite redirect loops.

**Step 4: Apply Settings**

1. Click **OK** (Advanced dialog)
2. Click **Apply** (Network settings)

**Step 5: Verify Configuration**

```bash
# Check current proxy settings
scutil --proxy
# Expected output includes:
#   HTTPProxy: localhost
#   HTTPPort: 8081
#   HTTPSProxy: localhost
#   HTTPSPort: 8081
```

**Visual Guide:**

```
System Settings
  └─ Network
      └─ [Active Network: Wi-Fi or Ethernet]
          └─ Details (or Advanced button)
              └─ Proxies tab
                  ├─ ☑ Web Proxy (HTTP)
                  │   ├─ Server: localhost
                  │   └─ Port: 8081
                  ├─ ☑ Secure Web Proxy (HTTPS)
                  │   ├─ Server: localhost
                  │   └─ Port: 8081
                  └─ Bypass proxy settings for these Hosts & Domains:
                      localhost, 127.0.0.1, *.local
```

---

### Windows Proxy Setup

**Step 1: Open Internet Options**

1. Open **Control Panel**
2. Navigate to **Network and Internet** → **Internet Options**
3. Click the **Connections** tab
4. Click **LAN settings** button

**Step 2: Configure Proxy Server**

1. Check **Use a proxy server for your LAN**
2. **Address:** `localhost`
3. **Port:** `8081`
4. Check **Bypass proxy server for local addresses** (this enables bypass list)

**Step 3: Configure Bypass List (Advanced)**

1. Click **Advanced** button
2. In the **Exceptions** field (Do not use proxy server for addresses beginning with:), add:

```
localhost;127.0.0.1;*.local
```

**Note:** Windows uses semicolons (`;`) to separate bypass entries, not commas.

**Step 4: Apply Settings**

1. Click **OK** (Advanced Proxy Settings)
2. Click **OK** (LAN Settings)
3. Click **OK** (Internet Properties)

**Step 5: Verify Configuration**

```powershell
# Check current proxy settings via registry
Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable, ProxyServer

# Expected output:
# ProxyEnable: 1
# ProxyServer: localhost:8081
```

**Visual Guide:**

```
Control Panel
  └─ Internet Options
      └─ Connections tab
          └─ LAN settings button
              ├─ ☑ Use a proxy server for your LAN
              │   ├─ Address: localhost
              │   └─ Port: 8081
              ├─ ☑ Bypass proxy server for local addresses
              └─ Advanced button
                  └─ Exceptions: localhost;127.0.0.1;*.local
```

---

### Linux Proxy Setup (GNOME)

**Step 1: Open Network Settings**

1. Open **Settings** application
2. Navigate to **Network**
3. Click **Network Proxy**

**Step 2: Configure Manual Proxy**

1. Select **Manual** method (not Automatic or Disabled)
2. Configure HTTP Proxy:
   - **HTTP Proxy:** `localhost`
   - **Port:** `8081`
3. Configure HTTPS Proxy:
   - **HTTPS Proxy:** `localhost`
   - **Port:** `8081`

**Step 3: Configure Ignore Hosts**

In the **Ignore Hosts** field, add:

```
localhost, 127.0.0.1, *.local
```

**Step 4: Apply Settings**

Click **Apply** or close Settings (GNOME applies changes automatically)

**Step 5: Verify Configuration**

```bash
# Check GNOME proxy settings
gsettings get org.gnome.system.proxy mode
# Expected: 'manual'

gsettings get org.gnome.system.proxy.http host
# Expected: 'localhost'

gsettings get org.gnome.system.proxy.http port
# Expected: 8081
```

**Visual Guide:**

```
Settings
  └─ Network
      └─ Network Proxy
          ├─ Method: Manual
          ├─ HTTP Proxy: localhost, Port: 8081
          ├─ HTTPS Proxy: localhost, Port: 8081
          └─ Ignore Hosts: localhost, 127.0.0.1, *.local
```

**Other Linux Desktop Environments:**

- **KDE Plasma:** System Settings → Network → Proxy → Manual Configuration
- **XFCE:** Settings → Network Proxy → Configuration Method: Manual proxy configuration
- **Environment Variables (CLI):** Export `http_proxy` and `https_proxy` variables:
  ```bash
  export http_proxy="http://localhost:8081"
  export https_proxy="http://localhost:8081"
  export no_proxy="localhost,127.0.0.1,*.local"
  ```

---

### Alternative: Browser-Specific Proxy

**When to Use This Option:**

- Your organization uses a corporate proxy or VPN
- You want to isolate proxy configuration to browser only (not system-wide)
- You need to quickly toggle proxy on/off for different projects

**FoxyProxy Extension (Chrome/Firefox)**

FoxyProxy enables pattern-based proxy routing, so only CloudFront domain requests use the proxy.

**Step 1: Install FoxyProxy**

- **Chrome:** [Chrome Web Store - FoxyProxy](https://chrome.google.com/webstore/detail/foxyproxy-standard)
- **Firefox:** [Firefox Add-ons - FoxyProxy Standard](https://addons.mozilla.org/en-US/firefox/addon/foxyproxy-standard/)

**Step 2: Configure Proxy Server**

1. Click FoxyProxy extension icon → **Options**
2. Click **Add New Proxy**
3. Configure proxy:
   - **Title:** `NDX Local Development`
   - **Proxy Type:** `HTTP`
   - **Proxy IP address or DNS name:** `localhost`
   - **Port:** `8081`
4. Click **Save**

**Step 3: Add URL Pattern**

1. In the proxy configuration, scroll to **URL Patterns**
2. Click **Add New Pattern**
3. Configure pattern:
   - **Pattern Name:** `CloudFront Domain`
   - **Pattern:** `*d7roov8fndsis.cloudfront.net*`
   - **Type:** `Wildcard`
   - **Whitelist/Blacklist:** `Whitelist` (route matching requests through proxy)
4. Click **Save**

**Step 4: Enable Pattern-Based Routing**

1. Click FoxyProxy extension icon
2. Select **Use proxies based on their pre-defined patterns and priorities**

**Step 5: Verify Configuration**

Navigate to `https://d7roov8fndsis.cloudfront.net` in your browser. The FoxyProxy icon should show:
- **Green:** Request routed through proxy (CloudFront domain matched)

Navigate to any other site (e.g., `https://google.com`). The FoxyProxy icon should show:
- **Gray/Black:** Request not proxied (no pattern match)

**Benefits:**
- **Isolated:** System proxy settings unaffected
- **Pattern-Based:** Only CloudFront requests proxied
- **Quick Toggle:** Easily enable/disable via extension icon

**Limitations:**
- **Browser-Only:** Each browser requires separate configuration
- **Extension Dependency:** Requires installing FoxyProxy extension

---

### Disabling the Proxy

**When to Disable:**

- Not actively developing Try features
- VPN or corporate proxy conflicts
- Troubleshooting network connectivity issues
- Switching to production CloudFront testing

**macOS:**

1. System Settings → Network → [Active Network] → Details/Advanced → Proxies tab
2. **Uncheck** Web Proxy (HTTP)
3. **Uncheck** Secure Web Proxy (HTTPS)
4. Click **OK** → **Apply**

**Windows:**

1. Control Panel → Internet Options → Connections → LAN settings
2. **Uncheck** Use a proxy server for your LAN
3. Click **OK** → **OK**

**Linux (GNOME):**

1. Settings → Network → Network Proxy
2. Select **Disabled** method
3. Settings apply automatically

**FoxyProxy (Browser Extension):**

1. Click FoxyProxy extension icon
2. Select **Disable FoxyProxy** or **Use System Proxy Settings**

**Quick Revert Test:**

After disabling proxy, test that normal internet access works:

```bash
curl https://google.com
# Expected: HTML response (not proxy error)
```

---

## Certificate Trust Setup

**Purpose:** Trust mitmproxy's CA certificate to enable HTTPS interception without browser security warnings.

**Why This is Needed:** The CloudFront domain (`https://d7roov8fndsis.cloudfront.net`) uses HTTPS. For mitmproxy to intercept and route these requests, it must decrypt the HTTPS traffic. This requires your operating system and browser to trust mitmproxy's self-signed CA certificate.

**Security Note:** ⚠️ **Only trust this certificate on development machines. Never use in production environments.** This certificate enables mitmproxy to decrypt all HTTPS traffic routed through the proxy. Remove trust when finished with local Try development.

---

### Certificate Generation and Location

**Automatic Generation:**

mitmproxy automatically generates a CA certificate on first run. You do not need to create this certificate manually.

**Certificate Location:**

```bash
~/.mitmproxy/mitmproxy-ca-cert.pem
```

**Verify Certificate Exists:**

```bash
# macOS/Linux
ls -la ~/.mitmproxy/mitmproxy-ca-cert.pem

# Windows (PowerShell)
Get-ChildItem ~\.mitmproxy\mitmproxy-ca-cert.pem
```

**If Certificate Does Not Exist:**

Start mitmproxy once to trigger certificate generation:

```bash
yarn dev:proxy
# Press 'q' to quit after seeing "Proxy server listening" message
```

The certificate will be generated in `~/.mitmproxy/` directory.

---

### macOS Certificate Trust

**Method 1: Double-Click Import (Recommended)**

**Step 1: Open Certificate File**

```bash
# Open Finder and navigate to certificate
open ~/.mitmproxy
```

In Finder, double-click `mitmproxy-ca-cert.pem`. This automatically opens **Keychain Access** and imports the certificate to your login keychain.

**Step 2: Find Certificate in Keychain Access**

1. Open **Keychain Access** application (Applications → Utilities → Keychain Access)
2. Ensure **login** keychain is selected in the left sidebar
3. Search for **"mitmproxy"** in the search box (top-right)
4. You should see "mitmproxy" certificate listed

**Step 3: Trust Certificate**

1. **Double-click** the "mitmproxy" certificate to open certificate info
2. Expand the **Trust** section (click the disclosure triangle)
3. Change **"When using this certificate:"** to **"Always Trust"**
4. Close the certificate info window
5. Enter your macOS password when prompted

**Step 4: Verify Trust**

The mitmproxy certificate should now show a **green checkmark** icon in Keychain Access, indicating it's trusted.

**Method 2: Drag to Keychain Access**

Alternatively, drag `mitmproxy-ca-cert.pem` from Finder directly onto the Keychain Access application icon or window, then follow steps 2-4 above.

**Visual Guide:**

```
Keychain Access
  └─ login (keychain)
      └─ Certificates category
          └─ mitmproxy
              ├─ Right-click or Double-click
              └─ Trust section
                  └─ When using this certificate: Always Trust
                      └─ Close window
                          └─ Enter password
                              └─ ✅ Green checkmark appears
```

---

### Windows Certificate Trust

**Step 1: Locate Certificate File**

```powershell
# Open File Explorer and navigate to certificate directory
explorer ~\.mitmproxy
```

**Step 2: Install Certificate**

1. **Double-click** `mitmproxy-ca-cert.pem` in File Explorer
2. Click **Install Certificate** button in the certificate dialog
3. Select **Store Location:**
   - Choose **Current User** (recommended for development machine)
   - Click **Next**

**Step 3: Select Certificate Store**

1. Select **"Place all certificates in the following store"**
2. Click **Browse** button
3. Select **"Trusted Root Certification Authorities"**
4. Click **OK**
5. Click **Next**

**Step 4: Complete Installation**

1. Click **Finish**
2. **Security Warning** appears: "Do you want to install this certificate?"
3. Click **Yes**
4. Success message: "The import was successful"

**Step 5: Verify Installation**

```powershell
# Open Certificate Manager
certmgr.msc
```

In Certificate Manager:
1. Expand **Trusted Root Certification Authorities**
2. Click **Certificates** folder
3. Find **"mitmproxy"** in the list (certificates are sorted alphabetically)

**Visual Guide:**

```
File Explorer
  └─ C:\Users\{username}\.mitmproxy\mitmproxy-ca-cert.pem
      └─ Double-click
          └─ Install Certificate
              ├─ Store Location: Current User → Next
              ├─ Certificate Store: Place all certificates in the following store
              │   └─ Browse → Trusted Root Certification Authorities → OK
              ├─ Next → Finish
              └─ Security Warning → Yes
                  └─ Success message
```

---

### Linux Certificate Trust

**Ubuntu/Debian**

**Step 1: Copy Certificate to System Trust Store**

```bash
# Copy certificate from ~/.mitmproxy to ca-certificates directory
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
```

**Note:** The file extension must be `.crt` (not `.pem`) for `update-ca-certificates` to process it.

**Step 2: Update CA Certificates**

```bash
# Update system CA certificate store
sudo update-ca-certificates
```

**Expected Output:**

```
Updating certificates in /etc/ssl/certs...
1 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
```

**Step 3: Verify Installation**

```bash
# Check certificate was added to system trust store
ls /etc/ssl/certs | grep mitmproxy
# Expected output: mitmproxy.pem (symlink to /usr/local/share/ca-certificates/mitmproxy.crt)
```

---

**Fedora/RHEL/CentOS**

**Step 1: Copy Certificate to Trust Anchors**

```bash
# Copy certificate to ca-trust anchors directory
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /etc/pki/ca-trust/source/anchors/mitmproxy.crt
```

**Step 2: Update CA Trust**

```bash
# Update system CA trust store
sudo update-ca-trust
```

**Step 3: Verify Installation**

```bash
# Check certificate was added
ls /etc/pki/ca-trust/source/anchors/ | grep mitmproxy
# Expected output: mitmproxy.crt
```

---

**Arch Linux**

**Step 1: Trust Certificate Using trust Anchor**

```bash
# Add certificate to trust anchors
sudo trust anchor ~/.mitmproxy/mitmproxy-ca-cert.pem
```

**Step 2: Verify Installation**

```bash
# List trusted certificates
trust list | grep mitmproxy
# Expected output: mitmproxy certificate details
```

---

**Browser Considerations on Linux:**

Some browsers (notably Firefox) maintain their own certificate trust store separate from the system trust store. If you encounter SSL warnings in Firefox after system-level certificate trust, see [Firefox-Specific Certificate Trust](#firefox-specific-certificate-trust).

---

### Firefox-Specific Certificate Trust

**When This is Needed:**

Firefox maintains its own certificate trust store on all platforms (macOS, Windows, Linux) and does not use the system certificate store. If you see SSL warnings in Firefox after trusting the certificate system-wide, follow these steps:

**Step 1: Open Firefox Certificate Manager**

1. Open **Firefox** browser
2. Navigate to **Settings** (or **Preferences**)
3. Scroll to **Privacy & Security** section
4. Under **Certificates**, click **View Certificates** button

**Step 2: Import Certificate**

1. Click the **Authorities** tab
2. Click **Import** button
3. Navigate to `~/.mitmproxy/mitmproxy-ca-cert.pem`
4. Select the certificate file and click **Open**

**Step 3: Trust Certificate**

Certificate Trust Settings dialog appears:

1. Check **"Trust this CA to identify websites"**
2. Optionally check **"Trust this CA to identify email users"** (not required for Try development)
3. Click **OK**

**Step 4: Verify Trust**

1. Still in the **Authorities** tab, search for **"mitmproxy"**
2. You should see "mitmproxy" listed under certificate authorities
3. Close Certificate Manager

**Step 5: Test**

Navigate to `https://d7roov8fndsis.cloudfront.net` in Firefox. You should see no SSL warnings.

**Visual Guide:**

```
Firefox Settings
  └─ Privacy & Security
      └─ Certificates section
          └─ View Certificates button
              └─ Authorities tab
                  └─ Import button
                      └─ Select ~/.mitmproxy/mitmproxy-ca-cert.pem
                          └─ Trust this CA to identify websites ☑
                              └─ OK
                                  └─ mitmproxy appears in authorities list ✅
```

---

### Security Considerations

**Critical Security Warnings:**

1. **Development Machines Only**
   - ⚠️ **Never trust the mitmproxy CA certificate on production servers, shared machines, or public computers**
   - This certificate should only be trusted on your personal development machine

2. **HTTPS Decryption Capability**
   - Trusting this certificate enables mitmproxy to decrypt **all HTTPS traffic** routed through the proxy
   - This includes passwords, API tokens, and sensitive data
   - Only traffic to the CloudFront domain (`d7roov8fndsis.cloudfront.net`) is proxied when system proxy configured correctly

3. **Scope Limitation**
   - System proxy configuration should include bypass list (`localhost, 127.0.0.1, *.local`)
   - Only CloudFront domain traffic is decrypted (not all internet traffic)
   - Verify bypass list configuration in [System Proxy Configuration](#system-proxy-configuration)

4. **Temporary Trust**
   - Remove certificate trust when finished with Try feature development
   - See [Removing Certificate Trust](#removing-certificate-trust) for removal instructions
   - Consider removing trust when switching to other projects or production work

5. **Certificate Sharing**
   - **Never share your `~/.mitmproxy/mitmproxy-ca-cert.pem` file with others**
   - Each developer should generate their own certificate (automatic on first mitmproxy run)
   - Never commit certificate files to version control (already in `.gitignore`)

**Best Practices:**

- Keep certificate trust confined to development machine
- Remove trust when switching to VPN or production work
- Never commit certificate to version control (confirmed in `.gitignore`)
- Regenerate certificate periodically for extra security: `rm -rf ~/.mitmproxy && yarn dev:proxy`

---

### Removing Certificate Trust

**When to Remove:**

- Finished with Try feature development
- Switching to production CloudFront testing
- No longer working on NDX project
- Security best practice (remove when not actively needed)

**Verification After Removal:**

Browse to `https://d7roov8fndsis.cloudfront.net` - you should see SSL warnings again (proves certificate trust was removed).

---

**macOS Certificate Removal**

**Step 1: Open Keychain Access**

1. Open **Keychain Access** application (Applications → Utilities)
2. Ensure **login** keychain is selected
3. Search for **"mitmproxy"**

**Step 2: Delete Certificate**

1. **Right-click** (or Control+click) the "mitmproxy" certificate
2. Select **Delete "mitmproxy"**
3. Enter your macOS password when prompted
4. Click **Delete** to confirm

**Step 3: Verify Removal**

Search for "mitmproxy" again - no results should appear.

---

**Windows Certificate Removal**

**Step 1: Open Certificate Manager**

```powershell
# Press Win+R, type certmgr.msc, press Enter
certmgr.msc
```

**Step 2: Navigate to Trusted Root Certificates**

1. Expand **Trusted Root Certification Authorities**
2. Click **Certificates** folder
3. Find **"mitmproxy"** in the list

**Step 3: Delete Certificate**

1. **Right-click** the "mitmproxy" certificate
2. Select **Delete**
3. Confirmation dialog appears: "Are you sure you want to permanently delete this certificate?"
4. Click **Yes**

**Step 4: Verify Removal**

Refresh Certificate Manager - "mitmproxy" should no longer appear in Trusted Root Certification Authorities.

---

**Linux Certificate Removal (Ubuntu/Debian)**

**Step 1: Remove Certificate File**

```bash
# Remove certificate from ca-certificates directory
sudo rm /usr/local/share/ca-certificates/mitmproxy.crt
```

**Step 2: Update CA Certificates**

```bash
# Update system CA certificate store with --fresh flag
sudo update-ca-certificates --fresh
```

**Expected Output:**

```
Updating certificates in /etc/ssl/certs...
0 added, 1 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
```

**Step 3: Verify Removal**

```bash
# Check certificate no longer in system trust store
ls /etc/ssl/certs | grep mitmproxy
# Expected output: (no output - certificate removed)
```

---

**Linux Certificate Removal (Fedora/RHEL)**

**Step 1: Remove Certificate File**

```bash
# Remove certificate from ca-trust anchors
sudo rm /etc/pki/ca-trust/source/anchors/mitmproxy.crt
```

**Step 2: Update CA Trust**

```bash
# Update system CA trust store
sudo update-ca-trust
```

**Step 3: Verify Removal**

```bash
# Check certificate no longer in anchors
ls /etc/pki/ca-trust/source/anchors/ | grep mitmproxy
# Expected output: (no output - certificate removed)
```

---

**Linux Certificate Removal (Arch Linux)**

**Step 1: Remove Certificate Using trust Anchor**

```bash
# Remove certificate from trust anchors
sudo trust anchor --remove ~/.mitmproxy/mitmproxy-ca-cert.pem
```

**Alternative (if above fails):**

```bash
# List certificate store to find certificate path
trust list | grep mitmproxy
# Note the certificate path shown

# Remove using path
sudo trust anchor --remove /etc/ca-certificates/trust-source/anchors/mitmproxy.pem
```

**Step 2: Verify Removal**

```bash
# List trusted certificates
trust list | grep mitmproxy
# Expected output: (no output - certificate removed)
```

---

**Firefox Certificate Removal**

**Step 1: Open Firefox Certificate Manager**

1. Open **Firefox** browser
2. Navigate to **Settings** → **Privacy & Security**
3. Under **Certificates**, click **View Certificates** button

**Step 2: Delete Certificate**

1. Click the **Authorities** tab
2. Search for **"mitmproxy"**
3. Select the "mitmproxy" certificate
4. Click **Delete or Distrust** button
5. Confirmation dialog appears: "Are you sure you want to delete these certificate authorities?"
6. Click **OK**

**Step 3: Verify Removal**

Search for "mitmproxy" again - no results should appear in Authorities tab.

---

## Troubleshooting

### Port Already in Use

**Symptom:** `EADDRINUSE: address already in use :::8080` or `:::8081`

**Check which process is using the port:**

**macOS/Linux:**
```bash
# Check port 8080
lsof -Pi :8080

# Check port 8081
lsof -Pi :8081
```

**Windows (PowerShell):**
```powershell
# Check port 8080
Get-NetTCPConnection -LocalPort 8080 | Select-Object -Property OwningProcess

# Find process name
Get-Process -Id <PID from previous command>
```

**Resolution Options:**

1. **Kill the process:**
   ```bash
   # macOS/Linux
   lsof -ti:8080 | xargs kill
   lsof -ti:8081 | xargs kill

   # Windows (PowerShell - run as Administrator)
   Stop-Process -Id <PID>
   ```

2. **Change mitmproxy port:**
   - Update port configuration in Story 4.3 npm script
   - Example: Use port 8082 instead of 8081

3. **Identify and stop service:**
   - If another service (e.g., existing web server) uses port 8080, stop it before starting NDX dev server

---

### mitmproxy Not Found After Installation

**Symptom:** `command not found: mitmproxy` or `'mitmproxy' is not recognized`

**Cause:** Python scripts directory not in system PATH

**Resolution:**

**macOS/Linux:**
```bash
# Add Python user base binary directory to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or source ~/.zshrc

# Alternative: Use full path
~/.local/bin/mitmproxy --version
```

**Windows:**
```powershell
# Check Python scripts directory
python -m site --user-site
# Expected output: C:\Users\<username>\AppData\Roaming\Python\Python3x\site-packages

# Add Scripts directory to PATH:
# Replace Python3x with your Python version (e.g., Python311)
setx PATH "%PATH%;C:\Users\<username>\AppData\Roaming\Python\Python3x\Scripts"

# Restart terminal for PATH changes to take effect
```

**Virtual Environment Consideration:**

If using a Python virtual environment:
```bash
# Activate virtual environment first
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate  # Windows

# Install mitmproxy in virtual environment
pip install mitmproxy

# mitmproxy will be available while venv is active
```

---

### SSL Certificate Warnings

**Symptom:** Browser shows "Your connection is not private" or "NET::ERR_CERT_AUTHORITY_INVALID"

**Cause:** mitmproxy CA certificate not trusted by browser/operating system

**Resolution:**

The mitmproxy CA certificate must be installed and trusted:

1. **Certificate location:** `~/.mitmproxy/mitmproxy-ca-cert.pem` (generated on first mitmproxy run)
2. **Installation steps:** See [Certificate Trust Setup](#certificate-trust-setup) for platform-specific certificate trust instructions
3. **Validation:** After trust setup, browsing to CloudFront domain should show no SSL warnings

**Security Note:** Only trust the mitmproxy CA certificate on development machines, never on production systems.

---

### Proxy Configuration Issues

#### Cannot Connect to CloudFront Domain

**Symptom:** Browser shows "Unable to connect" or "Connection refused" when navigating to `https://d7roov8fndsis.cloudfront.net`

**Cause:** mitmproxy not running on port 8081

**Resolution:**

1. **Verify mitmproxy is running:**
   ```bash
   # macOS/Linux
   lsof -Pi :8081
   # Expected: mitmproxy process listening

   # Windows (PowerShell)
   Get-NetTCPConnection -LocalPort 8081
   # Expected: LISTENING state
   ```

2. **Start mitmproxy if not running:**
   ```bash
   yarn dev:proxy
   # Wait for "Proxy server listening at *:8081" message
   ```

3. **Check system proxy points to correct port:**
   - macOS: `scutil --proxy` should show `HTTPPort: 8081`
   - Windows: Registry should show `ProxyServer: localhost:8081`
   - Linux: `gsettings get org.gnome.system.proxy.http port` should return `8081`

---

#### Infinite Redirect Loop

**Symptom:** Browser shows "ERR_TOO_MANY_REDIRECTS" or "The page isn't redirecting properly"

**Cause:** Bypass list not configured correctly - localhost requests are being proxied recursively

**Resolution:**

1. **Verify bypass list includes localhost:**
   - macOS: System Settings → Network → Proxies tab → Bypass list should include `localhost, 127.0.0.1, *.local`
   - Windows: Internet Options → LAN Settings → Advanced → Exceptions should include `localhost;127.0.0.1;*.local`
   - Linux: Settings → Network Proxy → Ignore Hosts should include `localhost, 127.0.0.1, *.local`

2. **Test bypass list works:**
   ```bash
   # This should NOT appear in mitmproxy console logs
   curl http://localhost:8080
   ```

3. **If bypass list configured correctly but issue persists:**
   - Restart browser to apply proxy settings
   - Clear browser cache and cookies
   - Disable any browser extensions that might interfere with proxy settings

---

#### VPN/Corporate Proxy Conflicts

**Symptom:** System proxy configuration fails or overwritten by corporate settings

**Cause:** Organization enforces proxy via Group Policy (Windows) or MDM profile (macOS)

**Resolution:**

Use **Browser-Specific Proxy** instead of system proxy:

1. Install FoxyProxy extension (see [Alternative: Browser-Specific Proxy](#alternative-browser-specific-proxy))
2. Configure FoxyProxy with pattern: `*d7roov8fndsis.cloudfront.net*` → `localhost:8081`
3. Corporate proxy settings remain unchanged
4. Only CloudFront domain routes through mitmproxy

**Benefits:** Isolates NDX development proxy from corporate network requirements.

---

#### Other Sites Broken After Proxy Configuration

**Symptom:** Non-CloudFront sites load slowly or fail to load

**Cause:** System proxy configured but mitmproxy not running, or bypass list incomplete

**Diagnosis:**

1. **Check if mitmproxy is running:**
   ```bash
   lsof -Pi :8081  # macOS/Linux
   Get-NetTCPConnection -LocalPort 8081  # Windows
   ```

2. **If mitmproxy not running and you're not developing Try features:**
   - Disable system proxy (see [Disabling the Proxy](#disabling-the-proxy))
   - System proxy should only be active during Try feature development

3. **If mitmproxy is running:**
   - Verify bypass list includes common local domains
   - Consider adding additional bypass entries for organization-specific domains

**Quick Fix:** Temporarily disable system proxy to restore normal internet access, then re-enable only when starting Try feature development.

---

#### Validation Command Fails

**Symptom:** `curl -x http://localhost:8081 https://d7roov8fndsis.cloudfront.net` returns error

**Possible Causes and Solutions:**

1. **"Failed to connect to localhost port 8081"**
   - mitmproxy not running → Start with `yarn dev:proxy`

2. **SSL certificate error (before Story 4.5 complete)**
   - Expected behavior → Certificate trust setup not yet complete
   - Solution: Continue to Story 4.5 for certificate trust instructions

3. **"Could not resolve host"**
   - DNS issue unrelated to proxy
   - Test with: `curl https://d7roov8fndsis.cloudfront.net` (without proxy)

**Expected Successful Output:**

```bash
$ curl -x http://localhost:8081 https://d7roov8fndsis.cloudfront.net
# Shows HTML content or SSL warning (if certificate not yet trusted)
# mitmproxy console displays request log entry
```

---

### Proxy Not Intercepting Requests

**Symptom:** Browsing to CloudFront domain loads production frontend (not localhost UI)

**Cause:** System proxy not configured or addon script not loaded

**Diagnosis:**

1. **Check mitmproxy is running:**
   ```bash
   # Should show mitmproxy listening on port 8081
   lsof -Pi :8081  # macOS/Linux
   Get-NetTCPConnection -LocalPort 8081  # Windows
   ```

2. **Check system proxy configuration:**
   - See [System Proxy Configuration](#system-proxy-configuration) for platform-specific setup verification
   - Proxy should be set to `localhost:8081` or `127.0.0.1:8081`

3. **Check addon script loaded:**
   - mitmproxy console should show "Addon loaded: scripts/mitmproxy-addon.py"
   - See [Story 4.2](../../sprint-artifacts/stories/) for addon script creation
   - See [Story 4.3](../../sprint-artifacts/stories/) for mitmproxy startup configuration

**Resolution:**
- Complete Stories 4.2 (addon script), 4.3 (npm script), and 4.4 (system proxy) before testing end-to-end workflow

---

### OAuth Redirects Not Working

**Symptom:** OAuth login redirects to CloudFront domain but shows errors or loops

**Cause:** CloudFront domain not preserved during proxy routing

**Explanation:**

The mitmproxy addon script is designed to preserve the CloudFront domain for OAuth callbacks. The Innovation Sandbox OAuth provider expects callback URLs like:
```
https://d7roov8fndsis.cloudfront.net/callback?token=...
```

The addon script ensures:
- **UI requests** to CloudFront domain are forwarded to `localhost:8080` (local UI)
- **API requests** to `/api/*` pass through to CloudFront unchanged (real backend)
- **OAuth callback URLs** remain on CloudFront domain (OAuth provider validation)

**Resolution:**

1. **Verify addon script routing logic:** See [Story 4.2](../../sprint-artifacts/stories/) for addon script implementation
2. **Check mitmproxy console:** Confirm UI routes show `localhost:8080` destination, API routes show CloudFront passthrough
3. **Test OAuth flow:** Complete Stories 4.2-4.5 before testing authentication end-to-end

**Design Note:** This is a critical architectural constraint. The mitmproxy addon cannot modify OAuth redirect URLs, as the OAuth provider validates callback domain. The addon only routes UI asset requests to localhost while preserving the CloudFront domain for API and OAuth flows.

---

## Validation

### Automated Validation Script

Run the automated validation script to check all prerequisites and configuration:

```bash
# Validate all prerequisites and configuration
yarn validate-setup
```

**Checks performed:**

| Check | Type | Description |
|-------|------|-------------|
| **mitmproxy installed** | Critical | Verifies `mitmproxy --version` executes successfully |
| **Addon script exists** | Critical | Checks `scripts/mitmproxy-addon.py` file exists |
| **Port 8080 available** | Warning | Checks if NDX server port is in use |
| **Port 8081 available** | Warning | Checks if mitmproxy port is in use |
| **CA certificate generated** | Warning | Checks `~/.mitmproxy/mitmproxy-ca-cert.pem` exists |

**Status Indicators:**
- ✅ **Check passed** - Requirement satisfied
- ❌ **Check failed (critical)** - Must fix before development
- ⚠️ **Warning** - Not critical but may need attention

**Example Output (All Checks Pass):**
```bash
$ yarn validate-setup

Validating local development setup...

✅ mitmproxy installed (Mitmproxy: 12.2.0 binary)
✅ Addon script found
✅ Port 8080 available
✅ Port 8081 available
✅ CA certificate generated

✅ Setup validation passed! Ready for development.
```

**Exit Codes:**
- **Exit 0:** All critical checks passed (ready for development)
- **Exit 1:** One or more critical checks failed (fix errors and retry)

**Note:** Ports in use and missing CA certificate show warnings but don't fail validation. You may have services already running on those ports, and the CA certificate auto-generates on first `yarn dev:proxy` run.

---

### Validation Scenarios

#### Scenario 1: Missing mitmproxy (Critical Failure)

```bash
$ yarn validate-setup

Validating local development setup...

❌ mitmproxy not installed
   → Run: pip install mitmproxy
✅ Addon script found
✅ Port 8080 available
✅ Port 8081 available
✅ CA certificate generated

❌ 1 validation check(s) failed. Fix errors above and retry.
```

**Resolution:** Install mitmproxy following [Installation](#installation) instructions for your platform.

---

#### Scenario 2: Port In Use (Warning Only)

```bash
$ yarn validate-setup

Validating local development setup...

✅ mitmproxy installed (Mitmproxy: 12.2.0 binary)
✅ Addon script found
⚠️  Port 8080 already in use (service may be running)
✅ Port 8081 available
✅ CA certificate generated

✅ Setup validation passed! Ready for development.
```

**Resolution:** Port warnings don't fail validation. If you intentionally have services running (e.g., existing NDX server), this is expected. If unexpected, check which process is using the port:

```bash
# macOS/Linux
lsof -Pi :8080

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 8080
```

---

#### Scenario 3: First-Time Setup (Certificate Not Yet Generated)

```bash
$ yarn validate-setup

Validating local development setup...

✅ mitmproxy installed (Mitmproxy: 12.2.0 binary)
✅ Addon script found
✅ Port 8080 available
✅ Port 8081 available
⚠️  CA certificate not found
   → Run 'yarn dev:proxy' to generate (first-time setup)

✅ Setup validation passed! Ready for development.
```

**Resolution:** Certificate warning is expected on first setup. The certificate auto-generates when you start mitmproxy for the first time:

```bash
yarn dev:proxy
# Press 'q' to quit after certificate generates
```

After generating the certificate, follow [Certificate Trust Setup](#certificate-trust-setup) instructions to trust it.

---

### Cross-Platform Compatibility

The validation script works on:
- **macOS:** Uses `lsof` for port checks
- **Linux:** Uses `lsof` for port checks (with fallback to `netstat`)
- **Windows (Git Bash):** Uses `netstat` for port checks

**Minimal Linux Distros:**

If `lsof` is not available (minimal Linux distros), the script automatically falls back to `netstat`. If neither is available:

```bash
ℹ️  Port 8080 check skipped (lsof/netstat not available)
ℹ️  Port 8081 check skipped (lsof/netstat not available)
```

This is informational only and doesn't fail validation. You can manually check ports if needed.

---

### When to Run Validation

**Recommended times to run `yarn validate-setup`:**

1. **After initial setup** - Verify all prerequisites installed correctly
2. **Before starting development** - Quick pre-flight check before `yarn dev:proxy`
3. **After system updates** - Ensure Python/mitmproxy still working after OS updates
4. **When troubleshooting** - Diagnose configuration issues quickly
5. **On new developer machines** - Verify setup complete before first Try development session

**Typical Workflow:**

```bash
# 1. Run validation before starting development
yarn validate-setup

# 2. If validation passes, start services
# Terminal 1: Start mitmproxy
yarn dev:proxy

# Terminal 2: Start NDX server
yarn start

# 3. Begin Try feature development
```

### Manual Validation Steps

Before automated validation script is available (Story 4.6 incomplete):

#### 1. Verify mitmproxy Installation

```bash
mitmproxy --version
# Expected: Mitmproxy 10.x.x or higher
```

#### 2. Verify Port Availability

**macOS/Linux:**
```bash
# Check port 8080
lsof -Pi :8080
# Expected: No output (port available)

# Check port 8081
lsof -Pi :8081
# Expected: No output (port available)
```

**Windows (PowerShell):**
```powershell
# Check port 8080
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
# Expected: No output (port available)

# Check port 8081
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
# Expected: No output (port available)
```

**Alternative port check (cross-platform):**
```bash
# Try to bind to port (if succeeds, port is available)
nc -z localhost 8080 && echo "Port 8080 in use" || echo "Port 8080 available"
nc -z localhost 8081 && echo "Port 8081 in use" || echo "Port 8081 available"
```

#### 3. Verify NDX Server Starts

```bash
# Start NDX development server (existing workflow)
yarn start

# Expected output includes:
# [11ty] Server at http://localhost:8080/
```

Visit `http://localhost:8080/` to confirm NDX homepage loads.

**Stop server (Ctrl+C) before proceeding to mitmproxy setup.**

#### 4. Verify mitmproxy Starts

```bash
# Start mitmproxy with addon
yarn dev:proxy

# Expected output includes:
# Proxy server listening at *:8081
# Loading script /path/to/scripts/mitmproxy-addon.py
# Transparent Proxy listening at *:8081
```

**Shutdown:** Press `q` in the mitmproxy console to stop the proxy cleanly.

**Note:** Port 8081 should be released after shutdown (verify with `lsof -Pi :8081` returning no results).

#### 5. End-to-End Validation (After Stories 4.2-4.5)

Once Stories 4.2 (addon script), 4.3 (npm script), 4.4 (system proxy), and 4.5 (certificate trust) are complete:

**Terminal 1:**
```bash
yarn dev:proxy
# mitmproxy starts on port 8081
```

**Terminal 2:**
```bash
yarn start
# NDX server starts on port 8080
```

**Browser:**
```
Navigate to: https://d7roov8fndsis.cloudfront.net
```

**Expected behavior:**
1. Browser uses system proxy (localhost:8081)
2. mitmproxy intercepts request
3. Addon routes UI request to localhost:8080
4. NDX homepage loads from local server
5. No SSL certificate warnings (CA certificate trusted - see [Certificate Trust Setup](#certificate-trust-setup))

**Verify in mitmproxy console:**
- UI requests show `→ localhost:8080` destination
- API requests (if any) show `→ d7roov8fndsis.cloudfront.net` passthrough

---

## Next Steps

After completing this setup guide:

1. ✅ **Story 4.1 Complete:** mitmproxy installation and prerequisite verification
2. ✅ **Story 4.2 Complete:** Create mitmproxy addon script for conditional request forwarding (`scripts/mitmproxy-addon.py`)
3. ✅ **Story 4.3 Complete:** Configure npm script (`yarn dev:proxy`) for mitmproxy startup
4. ✅ **Story 4.4 Complete:** System proxy configuration instructions (macOS, Windows, Linux)
5. ✅ **Story 4.5 Complete:** SSL certificate trust setup for HTTPS interception
6. ✅ **Story 4.6 Complete:** Automated validation script (`yarn validate-setup`)

**Epic 4 Status:** All stories complete! Local development infrastructure ready for Try feature development (Epic 5-8).

---

## References

- **Epic 4 Technical Specification:** [docs/sprint-artifacts/tech-spec-epic-4.md](../../sprint-artifacts/tech-spec-epic-4.md)
- **Try Before You Buy Architecture:** [docs/try-before-you-buy-architecture.md](../../try-before-you-buy-architecture.md)
- **NDX Development Guide:** [docs/development-guide.md](../development-guide.md)
- **mitmproxy Documentation:** https://docs.mitmproxy.org/stable/

---

**Document Version:** 1.3
**Created:** 2025-11-23
**Last Updated:** 2025-11-23 (Story 4.6: Setup Validation Script)
**Status:** Complete (Epic 4 - All Stories)
**Maintained By:** NDX Development Team
