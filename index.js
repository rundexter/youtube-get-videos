var _       = require('lodash')
  , google  = require('googleapis')
  , q       = require('q')
  , service = google.youtube('v3')
;

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var OAuth2       = google.auth.OAuth2
          , oauth2Client = new OAuth2()
          , access_token = dexter.provider('google').credentials('access_token')
          , part         = step.input('part').first()
          , self         = this
          , promises     = []
          , filter_age   = step.input('filter_age').first()
        ;

        // set credentials
        oauth2Client.setCredentials({ access_token: access_token });

        google.options({ auth: oauth2Client });

        step.input('playlistId').each(function(playlistId) {
            promises.push(
                q.nfcall(service.playlistItems.list.bind(service.videos), { playlistId: playlistId, part: part })
            );
        });

        step.input('id').each(function(id) {
            promises.push(
                q.nfcall(service.playlistItems.list.bind(service.videos), { id: id, part: part })
            );
        });

        q.all(promises)
          .then(function(results) {
            var items = [], now = new Date();
            _.each(results, function(result) {
              items = items.concat(_.map(result[0].items, function(i) {
                return { 
                  id                   : i.id
                  , channel_title      : _.get(i, 'snippet.channelTitle')
                  , video_url          : 'https://www.youtube.com/watch?v='+_.get(i, 'snippet.resourceId.videoId')
                  , video_id           : _.get(i, 'snippet.resourceId.videoId')
                  , video_publishedAt  : _.get(i, 'snippet.publishedAt')
                  , video_title        : _.get(i, 'snippet.title')
                  , video_thumbnail    : _.get(i, 'snippet.thumbnails.default.url')
                  , video_description  : _.get(i, 'snippet.description')
                };
              }));
            });
        
            if(filter_age) {
                items = _.filter(items, function(item) {
                    var dt = new Date(item.video_publishedAt);
                    return ((now.getTime()-dt.getTime())/(1000*60*60)) < filter_age;
                });
            }

            self.complete(items);
          })
          .catch(this.fail.bind(this))
        ;
    }
};
