import { App, Plugin, PluginSettingTab, Setting } from "obsidian";



// 1️⃣ อินเตอร์เฟซเก็บค่าการตั้งค่า
interface MyPluginSettings {
  enableFeature: boolean;
  textOption: string;
  DetectPlusToColor: string;
  action: { id: number, detect: string, addDetect: boolean, style: string, position: string }[];
}

// 2️⃣ ค่าพื้นฐาน
const DEFAULT_SETTINGS: MyPluginSettings = {
  enableFeature: true,
  textOption: "Hello, Obsidian!",
  DetectPlusToColor: "green",
  action: [
    {
      id: 1,
      detect: "++",
      addDetect: true,
      style: "color: #00db31;",
      position: "start"
    },
    {
      id: 2,
      detect: "--",
      addDetect: true,
      style: "color: red;",
      position: "start"
    },
  ],
};


export default class HighlightPlugin extends Plugin {
  settings: MyPluginSettings;



  async onload() {
    console.log("[HighlightPlugin] Loaded!");


    await this.loadSettings();
    // เพิ่ม Settings Tab
    this.addSettingTab(new MyPluginSettingTab(this.app, this));

    // สร้าง Event สำหรับการพิมพ์
    this.registerDomEvent(document, "keyup", (event: KeyboardEvent) => {
      this.handleTyping();
    });

    // สร้าง Event สำหรับการพิมพ์
    this.registerDomEvent(document, "input", () => {
      this.handleTyping();
    });

    // load style.css
    this.app.workspace.onLayoutReady(async () => {
      const cssPath = this.app.vault.adapter.getResourcePath(
        this.manifest.dir + "/style.css"
      );

      // ดึง CSS เป็นข้อความ
      const cssText = await fetch(cssPath).then((res) => res.text());

      // สร้าง <style> แล้วเพิ่ม CSS เข้าไป
      const styleEl = document.createElement("style");
      styleEl.textContent = cssText;
      document.head.appendChild(styleEl);

      console.log("CSS Loaded via <style> tag");
    });



  }

  // save and load settings
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.handleTyping();
  }


  // main freature
  handleTyping() {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) return;

    const editor = activeLeaf.view.sourceMode.cmEditor;
    if (!editor) return;

    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    // console.log(`[HighlightPlugin] Editing Line ${cursor.line}: "${line}"`);

    this.settings.action.forEach(action => {
      const escapedDetect = action.detect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedDetect}\\s+(.+)`);
      if (regex.test(line)) {
        const highlightedText = line.replace(regex, (_: any, text: string) => {
          if (action.position === "start") {
            return `<span style="${action.style}">${action.addDetect ? action.detect+' ' : '' }${text}</span>`;
          } else if (action.position === "end") {
            return `${text}<span style="${action.style}${action.addDetect ? ' '+action.detect : '' }"></span>`;
          } else {
            return text;
          }
        });

        editor.replaceRange(highlightedText, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });

        // console.log(`[HighlightPlugin] Highlighted text applied: "${highlightedText}"`);
      }
    });
  }

  onunload() {
    console.log("[HighlightPlugin] Unloaded!");
  }
}



// 3️⃣ สร้างหน้า Setting Tab
class MyPluginSettingTab extends PluginSettingTab {
  plugin: HighlightPlugin;

  constructor(app: App, plugin: HighlightPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty(); // ล้าง UI เดิม

    containerEl.createEl("h2", { text: "My Plugin Settings" });
    
    // ✅ Action Settings
    containerEl.createEl("h3", { text: "Actions" });

    new Setting(containerEl)
      .setName("Add New Action")
      .setDesc("Add a new action to the list.")

      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
          await this.plugin.saveSettings();
          this.display();
        }))
      .addButton((button) =>
        button.setButtonText("Add").setCta().onClick(async () => {
          this.plugin.settings.action.push({
            id: this.plugin.settings.action.length + 1,
            detect: "",
            addDetect: true,
            style: "color: white",
            position: "start",
          });
          await this.plugin.saveSettings();
          this.display();
        })
      );

    this.plugin.settings.action.forEach((action, index) => {
      // <div class="flex flex-col">
      const actionSetting = new Setting(containerEl);
      actionSetting.settingEl.classList.add("flex", "flex-col", "items-start");

      actionSetting.setName(`Action ${index + 1}`);

      // <div>
      const inputContainer = actionSetting.controlEl;
      inputContainer.classList.add("flex", "gap-2", "overflow-auto", "w-full", "h-full", "p-2");

      actionSetting.addText((text) =>
        text
          .setPlaceholder("Detect")
          .setValue(action.detect)
          .then((textEl) => textEl.inputEl.classList.add(`w-20`))
          .onChange(async (value) => {
            this.plugin.settings.action[index].detect = value;
            await this.plugin.saveSettings();
          })
      );

      actionSetting.addText((text) =>
        text
          .setPlaceholder("Style")
          .setValue(action.style)
          .then((textEl) => textEl.inputEl.classList.add(`w-full`))
          .onChange(async (value) => {
            this.plugin.settings.action[index].style = value;
            await this.plugin.saveSettings();
          })
      );

      actionSetting.addDropdown((dropdown) =>
        dropdown
          .addOption("start", "Start")
          .addOption("end", "End")
          .setValue(action.position)
          .then((dropdownEl) => dropdownEl.selectEl.classList.add("w-20"))
          .onChange(async (value) => {
            this.plugin.settings.action[index].position = value;
            await this.plugin.saveSettings();
          })
      );
      actionSetting.addToggle((toggle) =>
        toggle
          .setTooltip("Add detect text to the highlighted text.")
          .setValue(action.addDetect)
          .onChange(async (value) => {
        this.plugin.settings.action[index].addDetect = value;
        await this.plugin.saveSettings();
          })
      );
      // </div> </div>
      // Add a button to remove the action
      actionSetting.addButton((button) =>
        button.setButtonText("❌").onClick(async () => {
          this.plugin.settings.action.splice(index, 1);
          await this.plugin.saveSettings();
          this.display();
        })
      );

      // Add a separator line
      // containerEl.createEl("hr");
    });
  }
}