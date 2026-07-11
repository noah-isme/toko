export type Ward = {
  name: string;
  postalCode: string;
};

export type District = {
  name: string;
  wards: Ward[];
};

export type City = {
  name: string;
  districts: District[];
};

export type Province = {
  name: string;
  cities: City[];
};

export const indonesiaRegions: Province[] = [
  {
    name: 'DKI Jakarta',
    cities: [
      {
        name: 'Jakarta Selatan',
        districts: [
          {
            name: 'Setiabudi',
            wards: [
              { name: 'Karet', postalCode: '12920' },
              { name: 'Kuningan Barat', postalCode: '12950' },
            ],
          },
          {
            name: 'Kebayoran Baru',
            wards: [
              { name: 'Gandaria Utara', postalCode: '12140' },
              { name: 'Senayan', postalCode: '12190' },
            ],
          },
        ],
      },
      {
        name: 'Jakarta Pusat',
        districts: [
          {
            name: 'Tanah Abang',
            wards: [
              { name: 'Bendungan Hilir', postalCode: '10210' },
              { name: 'Gelora', postalCode: '10270' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Jawa Barat',
    cities: [
      {
        name: 'Bandung',
        districts: [
          {
            name: 'Coblong',
            wards: [
              { name: 'Dago', postalCode: '40135' },
              { name: 'Lebak Gede', postalCode: '40132' },
            ],
          },
          {
            name: 'Sukajadi',
            wards: [
              { name: 'Cipedes', postalCode: '40162' },
              { name: 'Pasteur', postalCode: '40161' },
            ],
          },
        ],
      },
    ],
  },
];
