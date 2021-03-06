﻿var jqGameArea;

var LEVEL_WIDTH = 30;
var LEVEL_HEIGHT = 30;
var GAME_AREA_WIDTH;
var GAME_AREA_HEIGHT;
var TILE_PIXEL_WIDTH = 30;
var TILE_PIXEL_HEIGHT = 30;

var currentGame;
var nextUnitID = 0;

var tiles = [];

$(document).ready(function () {
    initUINumbers();
    initEvents();
    initGame();
});

var initUINumbers = function () {
    jqGameArea = $('#game-area');
    GAME_AREA_WIDTH = jqGameArea.width();
    GAME_AREA_HEIGHT = jqGameArea.height();
};

var initEvents = function () {
    $('#btn-end-turn').click(function () {
        _game.endTurn();
    });
};

var initGame = function () {
    _game.setUpLevel(currentGame);
    var host = _player.new("Thomas");
    var opponent = _player.new("Andreas");
    var commander = _unitType.new("Commander", 20, 2, 100, 5, 1, 4);
    var unit1 = _unit.new(host, commander, 18, 10);
    var unit2 = _unit.new(opponent, commander, 10, 10);
    host.units = [unit1];
    opponent.units = [unit2];
    var newGame = {
        players: [host, opponent],
        host: host,
        units: [unit1, unit2]
    };
    currentGame = newGame;
    _game.start(currentGame);
};

var _game = {
    start: function (game) {
        game.currentTurn = 0;
        game.currentPlayer = game.players[Math.floor((Math.random() * 2))];
        _ui.updateCurrentPlayerText();
    },
    setUpLevel: function (game) {
        jqGameArea.empty();
        _ui.createTiles();
    },
    getUnitWithID: function (id) {
        var selectedUnit;
        for (var unitIndex in currentGame.units) {
            var unit = currentGame.units[unitIndex];
            if (unit.id == id) {
                selectedUnit = unit;
            }
        }
        return selectedUnit;
    },
    getDistanceBetweenUnits: function (unit1, unit2) {
        return Math.abs(unit1.positionX - unit2.positionX) + Math.abs(unit1.positionY - unit2.positionY);
    },
    moveUnit: function (unit, x, y) {
        unit.currentEnergy -= Math.abs(unit.positionX - x) + Math.abs(unit.positionY - y);
        unit.positionX = x;
        unit.positionY = y;
        _ui.updatePositionForUnit(unit);
    },
    orderUnitToAttack: function (attackingUnit, attackedUnit) {
        var totalDamage = _unit.calculateDamage(attackingUnit);
        attackedUnit.currentHitPoints -= totalDamage;
        _ui.updateHitPointBar(attackedUnit);
        if (attackingUnit.currentAttacks > 0) {
            attackingUnit.currentAttacks--;
        } else {
            attackingUnit.currentEnergy -= attackingUnit.unitType.energyPerAttack;
        }
    },
    endTurn: function () {
        currentGame.currentTurn++;
        _player.updateCurrentPlayer();
        _player.readyUnitsForPlayer(currentGame.currentPlayer);
        _ui.deselectUnits();
        _ui.updateCurrentPlayerText();
    }
};

var _player = {
    new: function (name) {
        return {
            name: name
        }
    },
    getOtherPlayer: function () {
        var player1 = currentGame.players[0];
        var player2 = currentGame.players[1];
        return currentGame.currentPlayer == player1 ? player2 : player1;
    },
    updateCurrentPlayer: function () {
        currentGame.currentPlayer = _player.getOtherPlayer();
    },
    readyUnitsForPlayer: function (player) {
        for (var unitIndex in player.units) {
            var unit = player.units[unitIndex];
            _unit.replenishEnergyForUnit(unit);
            _unit.replenishAttacksForUnit(unit);
        }
    }
};

var _unitType = {
    new: function (name, damage, attackSpeed, hitPoints, energy, attacks, energyPerAttack) {
        return {
            name: name,
            damage: damage,
            attackSpeed: attackSpeed,
            hitPoints: hitPoints,
            energy: energy,
            attacks: attacks,
            energyPerAttack: energyPerAttack
        };
    }
};

var _unit = {
    new: function (player, unitType, positionX, positionY) {
        var jqUnit = $('<div class="unit">');
        jqUnit.attr('unit-id', nextUnitID);
        jqUnit.click(function () {
            var selectedUnit = _ui.getUnitFromJqElement($(this));
            if (selectedUnit.player == currentGame.currentPlayer) {
                _ui.selectUnit(selectedUnit);
                _ui.showMovementForSelectedUnit();
            }
        });
        jqUnit.on("contextmenu", function (event) {
            _ui.handleRightClickOnUnit(event, $(this));
            return false;
        });

        var hitPointBar = _progressBar.newHPBar(
            {
                height: '5px',
                maxValue: unitType.hitPoints
            }
        );

        var returnUnit = {
            jqElement: jqUnit,
            hitPointBar: hitPointBar,
            id: nextUnitID,
            player: player,
            unitType: unitType,
            positionX: positionX,
            positionY: positionY,
            currentHitPoints: unitType.hitPoints,
            currentEnergy: unitType.energy,
            currentAttacks: unitType.attacks
        };

        _ui.updatePositionForUnit(returnUnit);
        jqGameArea.append(jqUnit);

        var jqBar = hitPointBar.jqElement;
        returnUnit.jqElement.append(jqBar);

        nextUnitID++;
        return returnUnit;
    },
    canAttack: function (unit) {
        return (unit.currentAttacks > 0 || unit.currentEnergy >= unit.unitType.energyPerAttack);
    },
    replenishEnergyForUnit: function (unit) {
        unit.currentEnergy = unit.unitType.energy;
    },
    replenishAttacksForUnit: function (unit) {
        unit.currentAttacks = unit.unitType.attacks;
    },
    calculateDamage: function (unit) {
        var totalDamage = unit.unitType.damage * unit.unitType.attackSpeed;
        return totalDamage;
    }
};

var _ui = {
    updateCurrentPlayerText: function () {
        $('#lbl-current-turn').html('Current player: ' + currentGame.currentPlayer.name);
    },
    updatePositionForUnit: function (unit) {
        unit.jqElement.css('left', _ui.ingameXToPixels(unit.positionX) + 'px');
        unit.jqElement.css('top', _ui.ingameYToPixels(unit.positionY) + 'px');
    },
    deselectUnits: function () {
        $('.unit.selected').removeClass('selected');
        $('.tile.can-be-moved-to').removeClass('can-be-moved-to');
        $('.unit.can-be-attacked').removeClass('can-be-attacked');
    },
    selectUnit: function (unit) {
        _ui.deselectUnits();
        unit.jqElement.addClass('selected');
    },
    getUnitFromJqElement: function (jqUnit) {
        var unitID = jqUnit.attr('unit-id');
        return _game.getUnitWithID(unitID);;
    },
    getSelectedUnit: function () {
        var unitID = $('.unit.selected').attr('unit-id');
        return _game.getUnitWithID(unitID);;
    },
    handleRightClickOnTile: function (event, jqTile) {
        var selectedUnit = _ui.getSelectedUnit();
        if (selectedUnit !== undefined) {
            if (jqTile.hasClass('can-be-moved-to')) {
                var x = jqTile.attr('x');
                var y = jqTile.attr('y');
                _game.moveUnit(selectedUnit, x, y);
            } else {
                _ui.deselectUnits();
            }
            _ui.showMovementForSelectedUnit();
        }
    },
    handleRightClickOnUnit: function (event, jqUnit) {
        var selectedUnit = _ui.getSelectedUnit();
        if (selectedUnit !== undefined) {
            if (jqUnit.hasClass('can-be-attacked')) {
                var attackedUnit = _ui.getUnitFromJqElement(jqUnit);
                _game.orderUnitToAttack(selectedUnit, attackedUnit);
            } else {
                _ui.deselectUnits();
            }
            _ui.showMovementForSelectedUnit();
        }
    },
    ingameXToPixels: function (val) {
        return TILE_PIXEL_WIDTH * val;
    },
    ingameYToPixels: function (val) {
        return TILE_PIXEL_HEIGHT * val;
    },
    pixelsToIngameX: function (val) {
        return Math.floor(val / TILE_PIXEL_WIDTH);
    },
    pixelsToIngameY: function (val) {
        return Math.floor(val / TILE_PIXEL_HEIGHT);
    },
    isUnitOnTile: function (unit, tile) {
        if (
            unit.positionX == tile.positionX &&
            unit.positionY == tile.positionY
        ) {
            return true;
        } else {
            return false;
        }
    },
    createTiles: function () {
        tiles = [];
        for (var x = 0; x < LEVEL_WIDTH; x++) {
            tiles[x] = [];
        }
        for (var y = 0; y < LEVEL_HEIGHT; y++) {
            for (var x = 0; x < LEVEL_WIDTH; x++) {
                var jqTile = $('<div class="tile">');
                var positionX = x;
                var positionY = y;
                jqTile.attr('x', positionX);
                jqTile.attr('y', positionY);
                jqTile.css('left', _ui.ingameXToPixels(positionX) + 'px');
                jqTile.css('top', _ui.ingameYToPixels(positionY) + 'px');
                jqGameArea.append(jqTile);

                jqTile.on("contextmenu", function (event) {
                    _ui.handleRightClickOnTile(event, $(this));
                    return false;
                });

                tiles[x][y] = {
                    jqElement: jqTile,
                    positionX: x,
                    positionY: y
                };
            }
        }
    },
    showMovementForSelectedUnit: function () {
        $('.tile.can-be-moved-to').removeClass('can-be-moved-to');
        $('.unit.can-be-attacked').removeClass('can-be-attacked');
        var unit = _ui.getSelectedUnit();
        if (unit !== undefined) {
            var minY = unit.positionY - unit.currentEnergy > 0 ? unit.positionY - unit.currentEnergy : 0;
            var maxY = unit.positionY + unit.currentEnergy < LEVEL_HEIGHT ? unit.positionY + unit.currentEnergy : LEVEL_HEIGHT - 1;
            var minX = unit.positionX - unit.currentEnergy > 0 ? unit.positionX - unit.currentEnergy : 0;
            var maxX = unit.positionX + unit.currentEnergy < LEVEL_WIDTH ? unit.positionX + unit.currentEnergy : LEVEL_WIDTH - 1;
            for (var y = minY; y <= maxY; y++) {
                for (var x = minX; x <= maxX; x++) {
                    // Has enough energy
                    if (Math.abs(unit.positionX - x) + Math.abs(unit.positionY - y) <= unit.currentEnergy) {
                        var isOcccupied = false;
                        for (var unitIndex in currentGame.units) {
                            var playerUnit = currentGame.units[unitIndex];
                            if (_ui.isUnitOnTile(playerUnit, tiles[x][y])) {
                                isOcccupied = true;
                            }
                        }
                        if (!isOcccupied) {
                            tiles[x][y].jqElement.addClass('can-be-moved-to');
                        }
                    }
                }
            }
            for (var unitIndex in _player.getOtherPlayer().units) {
                var playerUnit = _player.getOtherPlayer().units[unitIndex];
                if (
                    _game.getDistanceBetweenUnits(unit, playerUnit) == 1 &&
                    _unit.canAttack(unit)
                ) {
                    playerUnit.jqElement.addClass('can-be-attacked');
                }
            }
        }
    },
    updateHitPointBar: function (unit) {
        _progressBar.setValue(unit.hitPointBar, unit.currentHitPoints);
    }
};
