(function() {
    //
    // Components
    //

    // a renderable entity
    Crafty.c('Renderable', {
        init: function() {
            // we're using DOM Spirtes
            this.requires('2D, DOM');
        },
        // set which sprite to use -- should match up with a call to Crafty.sprite()
        spriteName: function(name) {
            this.requires(name);
            return this; // so we can chain calls to setup functions
        } 
    });

    // a component to fade out an entity over time
    Crafty.c('FadeOut', {
        init: function() {
            this.requires('2D');

            // the EnterFrame event is very useful for per-frame updates!
            this.bind("EnterFrame", function() {
                this.alpha = Math.max(this._alpha - this._fadeSpeed, 0.0);
                if (this.alpha < 0.05) {
                    this.trigger('Faded');
                    // its practically invisible at this point, remove the object
                    this.destroy();
                }
            });
        },
        // set the speed of fading out - should be a small number e.g. 0.01
        fadeOut: function(speed) {
            // reminder: be careful to avoid name clashes...
            this._fadeSpeed = speed;
            return this; // so we can chain calls to setup functions
        }
    });

    // rotate an entity continually
    Crafty.c('Rotate', {
        init: function() {
            this.requires('2D');

            // update rotation each frame
            this.bind("EnterFrame", function() {
                this.rotation = this._rotation + this._rotationSpeed;
            });
        },
        // set speed of rotation in degrees per frame
        rotate: function(speed) { 
            // rotate about the center of the entity               
            this.origin('center');
            this._rotationSpeed = speed;
            return this; // so we can chain calls to setup functions
        },
    });

    // an exciting explosion!
    Crafty.c('Explosion', {
        init: function() {
            // reuse some helpful components
            this.requires('Renderable, FadeOut')
                .spriteName('explosion' + Crafty.math.randomInt(1,2))
                .fadeOut(0.1);
        }
    });



    // a bullet, it shoots things
    Crafty.c('Deathbox', {
        init: function() {
            this.requires('Renderable, Collision, Color')
                .color('red');
        },
        deathbox: function(x,y,w,h) {
            this.attr({x:x, y:y, w:w, h:h})
                .collision();
        }
    });

    // a one button controller that sends the even ButtonHit when the button was hit!
    Crafty.c('Onebutton', {
        init: function() {
            this.requires('Keyboard')
              .bind('KeyDown', function(e) {
                    if (e.key === Crafty.keys.SPACE) {
                        this.trigger('ButtonHit');
                    }
                });
        }   
    });

    // a floating object that can be boosted upwards
    Crafty.c('Floater',{
        _boost: 0,
        _gravity: 0,

        init: function() {
            this.requires('2D')
                .bind("EnterFrame", function(){
                    // apply boost
                    if (this._boost > 0) {
                        this.y -= this._boost;
                        this._boost--;
                    }
                    this.y += this._gravity;
                });
        },
        floater: function(gravity) {
            this._gravity = gravity;
            return this;
        },
        boost: function(ammount) {
            this._boost += ammount;
        }

    });


    // Player component    
    Crafty.c('Player', {        
        init: function() {           
            this.requires('Renderable, Collision, Onebutton, Floater, WireHitBox')
                .spriteName('enemy1')
                .floater(2)
                
                // also react to the SPACE key being pressed
                .bind('ButtonHit', function() {
                    this.boost(10);
                })
                // collide with DEATH BOX and die
                .collision()
                .onHit('Deathbox', function() {
                    // DIE!!!
                    console.log("DIEEEEE");
                    Crafty.e('Explosion').attr({x:this.x, y:this.y});
                    this.destroy();
                });
        }
    });

    // A component to display the player's score
    Crafty.c('Score', {
        init: function() {
            this.score = 0;
            this.requires('2D, DOM, Text');
            this._textGen = function() {
                return "Score: " + this.score;
            };
            this.attr({w: 100, h: 20, x: 900, y: 0})
                .text(this._textGen);
        },
        // increment the score - note how we call this.text() to change the text!
        increment: function() {
            this.score = this.score + 1;
            this.text(this._textGen);
        }
    })


    //
    // Game loading and initialisation
    //    
    var Game = function() {
        Crafty.scene('loading', this.loadingScene);
        Crafty.scene('main', this.mainScene);
    };
    
    Game.prototype.initCrafty = function() {
        console.log("page ready, starting CraftyJS");
        Crafty.init(1000, 600);
        Crafty.canvas.init();
        
        Crafty.modules({ 'crafty-debug-bar': 'release' }, function () {
            if (Crafty.debugBar) {
               Crafty.debugBar.show();
            }
        });
    };
    
    // A loading scene -- pull in all the slow things here and create sprites
    Game.prototype.loadingScene = function() {
        var loading = Crafty.e('2D, Canvas, Text, Delay');
        loading.attr({x: 512, y: 200, w: 100, h: 20});
        loading.text('loading...');
        
        function onLoaded() {
            // set up sprites
            Crafty.sprite(64, 'img/shooter-sprites.png', {
                player: [0, 0],
                bullet: [0, 1],
                enemy1: [0, 2],
                enemy2: [1, 2],
                explosion1: [0, 3],
                explosion2: [1, 3]
                });
            
            // jump to the main scene in half a second
            loading.delay(function() {
                Crafty.scene('main');
            }, 500);
        }
        
        function onProgress(progress) {
            loading.text('loading... ' + progress.percent + '% complete');
        }
        
        function onError() {
            loading.text('could not load assets');
        }
        
        Crafty.load([
            // list of images to load
            'img/shooter-sprites.png'
        ], 
        onLoaded, onProgress, onError);
        
    };
    
    //
    // The main game scene
    //
    Game.prototype.mainScene = function() {
        // create a scoreboard
        Crafty.e('Score');

        //create a player...
        Crafty.e('Player').attr({x: 500, y: 300});

        Crafty.e('Deathbox').deathbox(0, 50, 1000, 50);

        Crafty.e('Deathbox').deathbox(0, 550, 1000, 50);
    };
    
    // kick off the game when the web page is ready
    $(document).ready(function() {
        var game = new Game();
        game.initCrafty();
        
        // start loading things
        Crafty.scene('loading');
    });
    
})();