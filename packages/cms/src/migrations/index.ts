import * as migration_20261115_152716_initial from './20261115_152716_initial';
import * as migration_20261115_160000_people from './20261115_160000_people';
import * as migration_20261115_160620_holder_as_written from './20261115_160620_holder_as_written';
import * as migration_20261115_171652_titles_and_links from './20261115_171652_titles_and_links';
import * as migration_20261115_182214_holder_title from './20261115_182214_holder_title';
import * as migration_20261115_215340_unique_wikidata from './20261115_215340_unique_wikidata';
import * as migration_20261115_233056_parents from './20261115_233056_parents';
import * as migration_20261116_015640_sovereign from './20261116_015640_sovereign';
import * as migration_20261118_201310_mcp_key_delete from './20261118_201310_mcp_key_delete';
import * as migration_20261121_220424_period_names from './20261121_220424_period_names';
import * as migration_20261122_004948_territory_other_names from './20261122_004948_territory_other_names';
import * as migration_20261123_164622_place_other_names from './20261123_164622_place_other_names';
import * as migration_20261123_173436_plain_french_names from './20261123_173436_plain_french_names';
import * as migration_20261123_175001_plain_french_register_names from './20261123_175001_plain_french_register_names';
import * as migration_20261124_111246_by_district from './20261124_111246_by_district';

export const migrations = [
  {
    up: migration_20261115_152716_initial.up,
    down: migration_20261115_152716_initial.down,
    name: '20261115_152716_initial',
  },
  {
    up: migration_20261115_160000_people.up,
    down: migration_20261115_160000_people.down,
    name: '20261115_160000_people',
  },
  {
    up: migration_20261115_160620_holder_as_written.up,
    down: migration_20261115_160620_holder_as_written.down,
    name: '20261115_160620_holder_as_written',
  },
  {
    up: migration_20261115_171652_titles_and_links.up,
    down: migration_20261115_171652_titles_and_links.down,
    name: '20261115_171652_titles_and_links',
  },
  {
    up: migration_20261115_182214_holder_title.up,
    down: migration_20261115_182214_holder_title.down,
    name: '20261115_182214_holder_title',
  },
  {
    up: migration_20261115_215340_unique_wikidata.up,
    down: migration_20261115_215340_unique_wikidata.down,
    name: '20261115_215340_unique_wikidata',
  },
  {
    up: migration_20261115_233056_parents.up,
    down: migration_20261115_233056_parents.down,
    name: '20261115_233056_parents',
  },
  {
    up: migration_20261116_015640_sovereign.up,
    down: migration_20261116_015640_sovereign.down,
    name: '20261116_015640_sovereign',
  },
  {
    up: migration_20261118_201310_mcp_key_delete.up,
    down: migration_20261118_201310_mcp_key_delete.down,
    name: '20261118_201310_mcp_key_delete',
  },
  {
    up: migration_20261121_220424_period_names.up,
    down: migration_20261121_220424_period_names.down,
    name: '20261121_220424_period_names',
  },
  {
    up: migration_20261122_004948_territory_other_names.up,
    down: migration_20261122_004948_territory_other_names.down,
    name: '20261122_004948_territory_other_names',
  },
  {
    up: migration_20261123_164622_place_other_names.up,
    down: migration_20261123_164622_place_other_names.down,
    name: '20261123_164622_place_other_names',
  },
  {
    up: migration_20261123_173436_plain_french_names.up,
    down: migration_20261123_173436_plain_french_names.down,
    name: '20261123_173436_plain_french_names',
  },
  {
    up: migration_20261123_175001_plain_french_register_names.up,
    down: migration_20261123_175001_plain_french_register_names.down,
    name: '20261123_175001_plain_french_register_names',
  },
  {
    up: migration_20261124_111246_by_district.up,
    down: migration_20261124_111246_by_district.down,
    name: '20261124_111246_by_district'
  },
];
