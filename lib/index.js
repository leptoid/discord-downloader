'use strict'

const Discord = require('discord.js')
const request = require('request')
const mkdirp = require('mkdirp')
const co = require('co')
const pify = require('pify')
const fs = require('fs')

const retry = (f, n) => f().catch(err => {
  if (n > 0) return retry(f, n - 1)
  else throw err
})

module.exports = class DDL {

  constructor(opts) {

    this.opts = opts || {}

    this.client = new Discord.Client()
    this.client.login(this.opts.login, this.opts.passwd)

    this.client.on('ready', () => {

      console.log("Logged in to Discord")

      this.client.on('message', co.wrap(function *(msg) {

        try {

          if (msg.author.id == this.client.user.id) return
          if (msg.attachments.length == 0) return

          const serv
          = (msg.channel.server || {name: 'Direct Messages'})
          .name.replace(/\//g, '_')

          const chan
          = (msg.channel.name || msg.channel.recipient.name)
          .replace(/\//g, '_')

          console.log(`Received attachment from ${serv}/${chan}`)

          yield pify(fs.stat)(`${serv}/${chan}`).catch(() => {
            console.log(`Creating directory ${serv}/${chan}`)
            return pify(mkdirp)(`${serv}/${chan}`)
          })

          yield Promise.all(msg.attachments.map(co.wrap(function *(file) {

            console.log(`Downloading ${file.filename}...`)

            yield retry(() => new Promise((ok, fail) => {
              request(file.url)
              .pipe(fs.createWriteStream(`${serv}/${chan}/${file.filename}`))
              .on('finish', ok)
              .on('error', fail)
            }), 3)

            console.log(`Downloaded ${file.filename}`)

          }.bind(this))))

        }
        catch (err) {
          console.error(err)
        }

      }.bind(this)))

    })

  }

}
