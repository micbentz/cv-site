package main

import (
	"net/http"
	"io/ioutil"
	"log"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.Static("/app/static"))
	e.Use(middleware.Secure())

	e.GET("/splits/privacy-policy", func(c echo.Context) error {
		content, err := ioutil.ReadFile("/app/static/splits/privacy-policy.html")
		if err != nil {
			log.Fatal(err)
		}
		text := string(content)
		return c.HTML(http.StatusOK, text)
	})

	e.GET("/parking-meters-gnv/privacy-policy", func(c echo.Context) error {
		content, err := ioutil.ReadFile("/app/static/parking-meters-gnv/privacy-policy.html")
		if err != nil {
			log.Fatal(err)
		}
		text := string(content)
		return c.HTML(http.StatusOK, text)
	})

	e.Logger.Fatal(e.Start(":8080"))
}
