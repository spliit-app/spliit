import JSDOMEnvironment from 'jest-environment-jsdom'

/**
 * The jsdom environment with the process timezone pinned to the project's
 * `testEnvironmentOptions.tz` (an IANA name) before the window is created.
 *
 * A test file only sees a copy of `process.env`, so it cannot switch timezone
 * itself; the environment runs in the worker's real process, where Node
 * resets its timezone whenever `process.env.TZ` is assigned.
 */
export default class TimezoneEnvironment extends JSDOMEnvironment {
  constructor(
    ...[config, context]: ConstructorParameters<typeof JSDOMEnvironment>
  ) {
    const { tz, ...testEnvironmentOptions } =
      config.projectConfig.testEnvironmentOptions
    if (typeof tz === 'string') process.env.TZ = tz
    super(
      {
        ...config,
        projectConfig: { ...config.projectConfig, testEnvironmentOptions },
      },
      context,
    )
  }
}
