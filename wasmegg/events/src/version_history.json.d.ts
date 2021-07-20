// version_history.json is extracted from https://apps.apple.com/us/app/egg-inc/id993492744
// Format the page's source in devtools and there will be a script tag
// <script type="fastboot/shoebox" id="shoebox-ember-data-store">...</script>
// which is a huge JSON blob containing a versionHistory array.

declare const versions: {
  versionDisplay: string;
  releaseNotes: string;
  releaseDate: string; // YYYY-MM-DD
}[];
export default versions;
