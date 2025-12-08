/**
 * Custom JSDOM environment for Jest 30 / jsdom v27+
 *
 * This environment provides a way to reconfigure the window.location
 * without triggering navigation errors, which is essential for testing
 * code that reads or modifies location properties.
 */
import JSDOMEnvironment from "jest-environment-jsdom"

class CustomJSDOMEnvironment extends JSDOMEnvironment {
  async setup() {
    await super.setup()

    // Expose reconfigure method on window for tests to use
    // This is the jsdom v27+ approved way to change the URL
    if (this.dom?.window) {
      this.global.jsdomReconfigure = (options) => {
        this.dom.reconfigure(options)
      }

      // Expose a way to intercept location.href assignments for testing redirects
      // This uses jsdom's internal impl symbol to spy on the href setter
      this.global.setupLocationHrefSpy = () => {
        let redirectUrl = ""
        const implSymbol = Reflect.ownKeys(this.global.window.location).find(
          (k) => typeof k === "symbol" && k.toString().includes("impl"),
        )

        if (implSymbol) {
          const impl = this.global.window.location[implSymbol]
          const originalHrefDescriptor = Object.getOwnPropertyDescriptor(impl, "href")

          Object.defineProperty(impl, "href", {
            get: () => redirectUrl || originalHrefDescriptor?.get?.call(impl) || "",
            set: (url) => {
              redirectUrl = url
              // Don't call original setter to avoid navigation errors
            },
            configurable: true,
          })

          return {
            getRedirectUrl: () => redirectUrl,
            restore: () => {
              if (originalHrefDescriptor) {
                Object.defineProperty(impl, "href", originalHrefDescriptor)
              }
            },
          }
        }
        return null
      }
    }
  }
}

export default CustomJSDOMEnvironment
