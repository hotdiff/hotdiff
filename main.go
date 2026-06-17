package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	appMenu := menu.NewMenu()

	diffMenu := menu.NewMenu()
	diffMenu.Append(menu.Text("About Hot Diff", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "show-about", nil)
	}))
	diffMenu.Append(menu.Separator())
	diffMenu.Append(menu.Text("Quit Hot Diff", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		runtime.Quit(app.ctx)
	}))
	appMenu.Append(menu.SubMenu("Diff", diffMenu))

	err := wails.Run(&options.App{
		Title:     "Hot Diff",
		Width:     1400,
		Height:    900,
		MinWidth:  1000,
		MinHeight: 700,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Menu:             appMenu,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
