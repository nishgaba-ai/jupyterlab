// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import {
  CommandLinker
} from '@jupyterlab/apputils';

import {
  Base64ModelFactory, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IRenderMime, RenderMime, defaultRendererFactories
} from '@jupyterlab/rendermime';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  createRendermimePlugins
} from './mimerenderers';

import {
  ApplicationShell
} from './shell';

export { ApplicationShell } from './shell';
export { ILayoutRestorer, LayoutRestorer } from './layoutrestorer';


/**
 * The type for all JupyterLab plugins.
 */
export
type JupyterLabPlugin<T> = IPlugin<JupyterLab, T>;


/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export
class JupyterLab extends Application<ApplicationShell> {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = {}) {
    super({ shell: new ApplicationShell() });
    this._info = {
      name: options.name || 'JupyterLab',
      namespace: options.namespace || 'jupyterlab',
      version:  options.version || 'unknown',
      devMode: options.devMode || false,
      settingsDir: options.settingsDir || '',
      assetsDir: options.assetsDir || '',
      disabled: options.disabled || { patterns: [], matches: [] },
      deferred: options.deferred || { patterns: [], matches: [] }
    };
    if (options.devMode) {
      this.shell.addClass('jp-mod-devMode');
    }

    this.serviceManager = new ServiceManager();

    let linker = new CommandLinker({ commands: this.commands });
    this.commandLinker = linker;

    let linkHandler = {
      handleLink: (node: HTMLElement, path: string) => {
        linker.connectNode(node, 'docmanager:open', { path });
      }
    };
    let initialFactories = defaultRendererFactories;
    this.rendermime = new RenderMime({ initialFactories, linkHandler });

    let registry = this.docRegistry = new DocumentRegistry();
    registry.addModelFactory(new Base64ModelFactory());

    if (options.mimeExtensions) {
      let plugins = createRendermimePlugins(options.mimeExtensions);
      plugins.forEach(plugin => { this.registerPlugin(plugin); });
    }
  }

  /**
   * The document registry instance used by the application.
   */
  readonly docRegistry: DocumentRegistry;

  /**
   * The rendermime instance used by the application.
   */
  readonly rendermime: RenderMime;

  /**
   * The command linker used by the application.
   */
  readonly commandLinker: CommandLinker;

  /**
   * The service manager used by the application.
   */
  readonly serviceManager: ServiceManager;

  /**
   * Whether the application is dirty.
   */
  get isDirty(): boolean {
    return this._dirtyCount > 0;
  }

  /**
   * The information about the application.
   */
  get info(): JupyterLab.IInfo {
    return this._info;
  }

  /**
   * Promise that resolves when state is first restored, returning layout description.
   *
   * #### Notes
   * This is just a reference to `shell.restored`.
   */
  get restored(): Promise<ApplicationShell.ILayout> {
    return this.shell.restored;
  }

  /**
   * Set the application state to dirty.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setDirty(): IDisposable {
    this._dirtyCount++;
    return new DisposableDelegate(() => {
      this._dirtyCount = Math.max(0, this._dirtyCount - 1);
    });
  }

  /**
   * Register plugins from a plugin module.
   *
   * @param mod - The plugin module to register.
   */
  registerPluginModule(mod: JupyterLab.IPluginModule): void {
    let data = mod.default;
    // Handle commonjs exports.
    if (!mod.hasOwnProperty('__esModule')) {
      data = mod as any;
    }
    if (!Array.isArray(data)) {
      data = [data];
    }
    data.forEach(item => { this.registerPlugin(item); });
  }

  /**
   * Register the plugins from multiple plugin modules.
   *
   * @param mods - The plugin modules to register.
   */
  registerPluginModules(mods: JupyterLab.IPluginModule[]): void {
    mods.forEach(mod => { this.registerPluginModule(mod); });
  }

  private _info: JupyterLab.IInfo;
  private _dirtyCount = 0;
}


/**
 * The namespace for `JupyterLab` class statics.
 */
export
namespace JupyterLab {
  /**
   * The options used to initialize a JupyterLab object.
   */
  export
  interface IOptions {
    /**
     * The name of the JupyterLab application.
     */
    name?: string;

    /**
     * The namespace/prefix plugins may use to denote their origin.
     *
     * #### Notes
     * This field may be used by persistent storage mechanisms such as state
     * databases, cookies, session storage, etc.
     *
     * If unspecified, the default value is `'jupyterlab'`.
     */
    namespace?: string;

    /**
     * The version of the JupyterLab application.
     */
    version?: string;

    /**
     * Whether the application is in dev mode.
     */
    devMode?: boolean;

    /**
     * The settings directory of the app on the server.
     */
    settingsDir?: string;

    /**
     * The assets directory of the app on the server.
     */
    assetsDir?: string;

    /**
     * The mime renderer extensions.
     */
    mimeExtensions?: IRenderMime.IExtensionModule[];

    /**
     * The collection of deferred extension patterns and matched extensions.
     */
    deferred?: { patterns: string[], matches: string[] };

    /**
     * The collection of disabled extension patterns and matched extensions.
     */
    disabled?: { patterns: string[], matches: string[] };
  }

  /**
   * The information about a JupyterLab application.
   */
  export
  interface IInfo {
    /**
     * The name of the JupyterLab application.
     */
    readonly name: string;

    /**
     * The namespace/prefix plugins may use to denote their origin.
     */
    readonly namespace: string;

    /**
     * The version of the JupyterLab application.
     */
    readonly version: string;

    /**
     * Whether the application is in dev mode.
     */
    readonly devMode: boolean;

    /**
     * The settings directory of the app on the server.
     */
    readonly settingsDir: string;

    /**
     * The assets directory of the app on the server.
     */
    readonly assetsDir: string;

    /**
     * The collection of deferred extension patterns and matched extensions.
     */
    readonly deferred: { patterns: string[], matches: string[] };

    /**
     * The collection of disabled extension patterns and matched extensions.
     */
    readonly disabled: { patterns: string[], matches: string[] };
  }

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export
  interface IPluginModule {
    /**
     * The default export.
     */
    default: JupyterLabPlugin<any> | JupyterLabPlugin<any>[];
  }
}
