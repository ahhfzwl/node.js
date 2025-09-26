#!/bin/bash
export LANG=en_US.UTF-8
export uuid=${UUID:-''}
export vl_port=${PORT:-''}
wget https://raw.githubusercontent.com/ahhfzwl/node.js/main/app.js
wget https://raw.githubusercontent.com/ahhfzwl/node.js/main/package.json
sed -i "s/('UUID', '')/('UUID', '$uuid')/g" "app.js"
sed -i "s/('PORT', '')/('PORT', '$vl_port')/g" "app.js"
npm start
