var _       = require('lodash')
  , google  = require('googleapis')
  , util    = require('./util.js')
  , q       = require('q')
  , service = google.youtube('v3')
;

var pickInputs = {
        'part': 'part',
        'chart': 'chart',
        'id': 'id',
        'myRating': 'myRating',
        'hl': 'hl',
        'maxResults': 'maxResults',
        'videoCategoryId': 'videoCategoryId'
    },
    pickOutputs = {
        'kind': 'kind',
        'etag': 'etag',
        'totalResults': 'pageInfo.totalResults',
        'items': 'items'
    };

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
        ;

        // set credentials
        oauth2Client.setCredentials({ access_token: access_token });

        google.options({ auth: oauth2Client });

        //make the data an array, so that join works
        step.input('playlistId').each(function(playlistId) {
            promises.push(
                q.nfcall(service.playlistItems.list.bind(service.videos), { playlistId: playlistId, part: part })
            );
        });

        q.all(promises)
          .then(function(results) {
            var items = [];
            _.each(results, function(result) {
               items = items.concat(_.map(result[0].items, function(i) {
                      return { 
                          id                   : i.id
                          , playlist_title     : _.get(i, 'snippet.title')
                          , playlist_thumbnail : _.get(i, 'snippet.thumbnails.default.url')
                          , channel_title      : _.get(i, 'snippet.channelTitle')
                          , video_url          : 'https://www.youtube.com/watch?v='+_.get(i, 'snippet.resourceId.videoId')
                          , video_id           : _.get(i, 'snippet.resourceId.videoId')
                      };
               }));
            });

            self.complete(items);
          })
          .catch(this.fail.bind(this))
        ;
    }
};
